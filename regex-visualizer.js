(function (root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.RegexVisualizer = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_LIMITS = Object.freeze({
    maxLength: 4000,
    maxNodes: 1200,
    maxDepth: 80,
  });

  function RegexParseError(message, index, details) {
    this.name = 'RegexParseError';
    this.message = message;
    this.index = index;
    this.details = details || {};
  }

  RegexParseError.prototype = Object.create(Error.prototype);
  RegexParseError.prototype.constructor = RegexParseError;

  function isValidGroupName(name) {
    return /^[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u.test(name);
  }

  function normalizeGroupName(name) {
    var invalidEscape = false;
    var normalized = name.replace(
      /\\u(?:\{([0-9A-Fa-f]+)\}|([0-9A-Fa-f]{4}))/g,
      function (match, bracedCodePoint, fixedCodePoint) {
        var codePoint = parseInt(bracedCodePoint || fixedCodePoint, 16);
        if (codePoint > 0x10FFFF) {
          invalidEscape = true;
          return match;
        }
        return String.fromCodePoint(codePoint);
      }
    );

    if (invalidEscape || normalized.indexOf('\\') !== -1) {
      return null;
    }
    return isValidGroupName(normalized) ? normalized : null;
  }

  function scanRegexMetadata(source) {
    var captureGroupCount = 0;
    var hasNamedCaptureGroup = false;
    var inCharacterClass = false;

    for (var index = 0; index < source.length; index += 1) {
      var current = source[index];
      if (current === '\\') {
        index += 1;
      } else if (current === '[' && !inCharacterClass) {
        inCharacterClass = true;
      } else if (current === ']' && inCharacterClass) {
        inCharacterClass = false;
      } else if (current === '(' && !inCharacterClass) {
        var prefix = source.slice(index + 1, index + 4);
        if (prefix.slice(0, 2) === '?:'
            || prefix.slice(0, 2) === '?='
            || prefix.slice(0, 2) === '?!'
            || prefix === '?<='
            || prefix === '?<!') {
          continue;
        }
        captureGroupCount += 1;
        if (prefix.slice(0, 2) === '?<') {
          hasNamedCaptureGroup = true;
        }
      }
    }

    return {
      captureGroupCount: captureGroupCount,
      hasNamedCaptureGroup: hasNamedCaptureGroup,
    };
  }

  function RegexParser(source, flags, limits, metadata) {
    this.source = source;
    this.flags = flags;
    this.unicodeMode = flags.indexOf('u') !== -1
      || flags.indexOf('v') !== -1;
    this.limits = limits;
    this.index = 0;
    this.nodeCount = 0;
    this.depth = 0;
    this.captureGroupCount = 0;
    this.totalCaptureGroupCount = metadata.captureGroupCount;
    this.hasNamedCaptureGroup = metadata.hasNamedCaptureGroup;
    this.namedGroups = Object.create(null);
    this.namedReferences = [];
  }

  RegexParser.prototype.createNode = function (
    type,
    start,
    end,
    description,
    children
  ) {
    this.nodeCount += 1;
    if (this.nodeCount > this.limits.maxNodes) {
      throw new RegexParseError(
        'Regular expression exceeds the node limit',
        start,
        { limit: this.limits.maxNodes, limitType: 'maxNodes' }
      );
    }

    return {
      type: type,
      raw: this.source.slice(start, end),
      start: start,
      end: end,
      description: description,
      children: children || [],
    };
  };

  RegexParser.prototype.parse = function () {
    var start = this.index;
    var child = this.parseAlternation();

    if (this.index !== this.source.length) {
      throw new RegexParseError(
        'Unexpected token "' + this.source[this.index] + '"',
        this.index
      );
    }
    for (var index = 0; index < this.namedReferences.length; index += 1) {
      var reference = this.namedReferences[index];
      if (!this.namedGroups[reference.name]) {
        throw new RegexParseError(
          'Unknown named capturing group ' + reference.name,
          reference.index
        );
      }
    }

    return this.createNode(
      'expression',
      start,
      this.index,
      'Regular expression',
      [child]
    );
  };

  RegexParser.prototype.parseAlternation = function () {
    var start = this.index;
    var branches = [this.parseSequence()];

    while (this.source[this.index] === '|') {
      this.index += 1;
      branches.push(this.parseSequence());
    }

    if (branches.length === 1) {
      return branches[0];
    }

    return this.createNode(
      'alternation',
      start,
      this.index,
      'Alternatives',
      branches
    );
  };

  RegexParser.prototype.parseSequence = function () {
    var start = this.index;
    var children = [];

    while (this.index < this.source.length) {
      var current = this.source[this.index];
      if (current === ')' || current === '|') {
        break;
      }
      children.push(this.parseAtom());
    }

    return this.createNode(
      'sequence',
      start,
      this.index,
      'Sequence',
      children
    );
  };

  RegexParser.prototype.parseAtom = function () {
    var start = this.index;
    var current = this.source[this.index];
    var node;

    if (current === '*' || current === '+' || current === '?'
        || (current === '{' && this.unicodeMode)) {
      throw new RegexParseError('Invalid quantifier', start);
    }

    if (current === '(') {
      node = this.parseGroup();
    } else if (current === '[') {
      node = this.parseCharacterClass();
    } else if (current === '\\') {
      node = this.parseEscape();
    } else if (current === '.') {
      this.index += 1;
      node = this.createNode(
        'wildcard',
        start,
        this.index,
        'Match any character except line terminators',
        []
      );
    } else if (current === '^' || current === '$') {
      this.index += 1;
      node = this.createNode(
        'anchor',
        start,
        this.index,
        current === '^' ? 'Start anchor' : 'End anchor',
        []
      );
    } else {
      this.index += 1;
      node = this.createNode(
        'literal',
        start,
        this.index,
        'Literal character',
        []
      );
    }

    return this.parseQuantifier(node);
  };

  RegexParser.prototype.parseEscape = function () {
    var start = this.index;
    this.index += 1;
    if (this.index >= this.source.length) {
      throw new RegexParseError('Trailing escape', start);
    }

    var current = this.source[this.index];
    var node;
    var escapeKinds = {
      d: ['digit', 'Match a digit'],
      D: ['nonDigit', 'Match a non-digit'],
      w: ['word', 'Match a word character'],
      W: ['nonWord', 'Match a non-word character'],
      s: ['whitespace', 'Match whitespace'],
      S: ['nonWhitespace', 'Match non-whitespace'],
      b: ['wordBoundary', 'Match a word boundary'],
      B: ['nonWordBoundary', 'Match a non-word boundary'],
    };

    if (/[1-9]/.test(current)) {
      var numberStart = this.index;
      while (/[0-9]/.test(this.source[this.index])) {
        this.index += 1;
      }
      var referenceNumber = Number(
        this.source.slice(numberStart, this.index)
      );
      if (referenceNumber <= this.totalCaptureGroupCount) {
        node = this.createNode(
          'backreference',
          start,
          this.index,
          'Backreference to capturing group',
          []
        );
        node.referenceNumber = referenceNumber;
      } else {
        node = this.createNode(
          'legacyEscape',
          start,
          this.index,
          current <= '7'
            ? 'Legacy octal escape'
            : 'Legacy identity escape',
          []
        );
      }
      return node;
    }

    if (current === 'k' && this.source[this.index + 1] === '<') {
      var nameEnd = this.source.indexOf('>', this.index + 2);
      if (!this.unicodeMode && !this.hasNamedCaptureGroup) {
        this.index += 1;
        return this.createNode(
          'legacyEscape',
          start,
          this.index,
          'Legacy identity escape',
          []
        );
      }
      if (nameEnd === -1) {
        throw new RegexParseError('Unclosed named backreference', start);
      }
      var referenceName = normalizeGroupName(
        this.source.slice(this.index + 2, nameEnd)
      );
      if (referenceName === null) {
        throw new RegexParseError(
          'Invalid named backreference',
          this.index + 2
        );
      }
      this.index = nameEnd + 1;
      node = this.createNode(
        'backreference',
        start,
        this.index,
        'Backreference to named capturing group ' + referenceName,
        []
      );
      node.referenceName = referenceName;
      this.namedReferences.push({
        name: referenceName,
        index: start,
      });
      return node;
    }

    this.index += 1;
    node = this.createNode(
      'escape',
      start,
      this.index,
      escapeKinds[current]
        ? escapeKinds[current][1]
        : 'Escaped token',
      []
    );
    node.escapeKind = escapeKinds[current]
      ? escapeKinds[current][0]
      : 'literal';
    return node;
  };

  RegexParser.prototype.parseGroup = function () {
    var start = this.index;
    var groupKind = 'capturing';
    var groupNumber = null;
    var groupName = null;
    var nodeType = 'captureGroup';
    var description;

    this.depth += 1;
    if (this.depth > this.limits.maxDepth) {
      throw new RegexParseError(
        'Regular expression exceeds the depth limit',
        start,
        { limit: this.limits.maxDepth, limitType: 'maxDepth' }
      );
    }

    this.index += 1;
    if (this.source.slice(this.index, this.index + 2) === '?:') {
      groupKind = 'nonCapturing';
      nodeType = 'group';
      this.index += 2;
    } else if (this.source.slice(this.index, this.index + 2) === '?=') {
      groupKind = 'positiveLookahead';
      nodeType = 'assertion';
      this.index += 2;
    } else if (this.source.slice(this.index, this.index + 2) === '?!') {
      groupKind = 'negativeLookahead';
      nodeType = 'assertion';
      this.index += 2;
    } else if (this.source.slice(this.index, this.index + 3) === '?<=') {
      groupKind = 'positiveLookbehind';
      nodeType = 'assertion';
      this.index += 3;
    } else if (this.source.slice(this.index, this.index + 3) === '?<!') {
      groupKind = 'negativeLookbehind';
      nodeType = 'assertion';
      this.index += 3;
    } else if (this.source.slice(this.index, this.index + 2) === '?<') {
      var nameEnd = this.source.indexOf('>', this.index + 2);
      if (nameEnd === -1) {
        throw new RegexParseError('Unclosed named capturing group', start);
      }
      groupName = normalizeGroupName(
        this.source.slice(this.index + 2, nameEnd)
      );
      if (groupName === null) {
        throw new RegexParseError('Invalid capturing group name', this.index + 2);
      }
      if (this.namedGroups[groupName]) {
        throw new RegexParseError(
          'Duplicate named capturing group ' + groupName,
          this.index + 2
        );
      }
      this.namedGroups[groupName] = true;
      groupKind = 'namedCapturing';
      this.index = nameEnd + 1;
      this.captureGroupCount += 1;
      groupNumber = this.captureGroupCount;
    } else {
      this.captureGroupCount += 1;
      groupNumber = this.captureGroupCount;
    }

    var child;
    try {
      child = this.parseAlternation();
      if (this.source[this.index] !== ')') {
        throw new RegexParseError('Unclosed group', start);
      }
      this.index += 1;
    } finally {
      this.depth -= 1;
    }

    if (groupKind === 'capturing') {
      description = 'Capturing group ' + groupNumber;
    } else if (groupKind === 'namedCapturing') {
      description = 'Named capturing group ' + groupName;
    } else if (groupKind === 'nonCapturing') {
      description = 'Non-capturing group';
    } else if (groupKind === 'positiveLookahead') {
      description = 'Positive lookahead';
    } else if (groupKind === 'negativeLookahead') {
      description = 'Negative lookahead';
    } else if (groupKind === 'positiveLookbehind') {
      description = 'Positive lookbehind';
    } else {
      description = 'Negative lookbehind';
    }

    var node = this.createNode(
      nodeType,
      start,
      this.index,
      description,
      [child]
    );
    node.groupKind = groupKind;
    if (groupNumber !== null) {
      node.groupNumber = groupNumber;
    }
    if (groupName !== null) {
      node.groupName = groupName;
    }
    return node;
  };

  RegexParser.prototype.parseQuantifier = function (node) {
    var start = this.index;
    var min;
    var max;
    var current = this.source[this.index];
    var hasQuantifier = current === '*' || current === '+' || current === '?'
      || /^\{\d+(?:,\d*)?\}/.test(this.source.slice(this.index));
    var isWordBoundary = node.type === 'escape'
      && (node.escapeKind === 'wordBoundary'
        || node.escapeKind === 'nonWordBoundary');
    var isLookbehind = node.type === 'assertion'
      && (node.groupKind === 'positiveLookbehind'
        || node.groupKind === 'negativeLookbehind');
    var isStrictLookahead = node.type === 'assertion'
      && !isLookbehind
      && this.unicodeMode;

    if (hasQuantifier
        && (node.type === 'anchor'
          || isWordBoundary
          || isLookbehind
          || isStrictLookahead)) {
      throw new RegexParseError('Invalid quantifier for assertion', start);
    }

    if (current === '*') {
      min = 0;
      max = Infinity;
      this.index += 1;
    } else if (current === '+') {
      min = 1;
      max = Infinity;
      this.index += 1;
    } else if (current === '?') {
      min = 0;
      max = 1;
      this.index += 1;
    } else if (current === '{') {
      var match = /^\{(\d+)(,(\d*)?)?\}/.exec(
        this.source.slice(this.index)
      );
      if (!match) {
        return node;
      }
      if (!Number.isSafeInteger(Number(match[1]))
          || (match[3]
            && !Number.isSafeInteger(Number(match[3])))) {
        throw new RegexParseError(
          'Quantifier exceeds the safe integer range',
          start,
          {
            quantifierRaw: match[0]
              + (this.source[this.index + match[0].length] === '?'
                ? '?'
                : ''),
          }
        );
      }
      min = Number(match[1]);
      max = match[2] == null
        ? min
        : match[3] == null || match[3] === ''
          ? Infinity
          : Number(match[3]);
      if (max < min) {
        throw new RegexParseError('Invalid quantifier range', start);
      }
      this.index += match[0].length;
    } else {
      return node;
    }

    var greedy = true;
    if (this.source[this.index] === '?') {
      greedy = false;
      this.index += 1;
    }

    node.quantifier = {
      min: min,
      max: max,
      greedy: greedy,
      raw: this.source.slice(start, this.index),
    };
    node.end = this.index;
    node.raw = this.source.slice(node.start, node.end);
    if (/^\{\d+(?:,\d*)?\}/.test(this.source.slice(this.index))) {
      throw new RegexParseError('Invalid repeated quantifier', this.index);
    }
    return node;
  };

  RegexParser.prototype.parseCharacterClass = function () {
    var start = this.index;
    var escaped = false;
    var negated = this.source[this.index + 1] === '^';

    this.index += 1;
    while (this.index < this.source.length) {
      var current = this.source[this.index];
      this.index += 1;

      if (escaped) {
        escaped = false;
      } else if (current === '\\') {
        escaped = true;
      } else if (current === ']') {
        var node = this.createNode(
          'characterClass',
          start,
          this.index,
          negated ? 'Negated character class' : 'Character class',
          []
        );
        node.negated = negated;
        return node;
      }
    }

    throw new RegexParseError('Unclosed character class', start);
  };

  function normalizeLimits(limits) {
    limits = limits || {};
    function normalizeLimit(value, fallback) {
      return typeof value === 'number'
        && Number.isFinite(value)
        && Number.isInteger(value)
        && value > 0
        ? value
        : fallback;
    }

    return {
      maxLength: normalizeLimit(
        limits.maxLength,
        DEFAULT_LIMITS.maxLength
      ),
      maxNodes: normalizeLimit(
        limits.maxNodes,
        DEFAULT_LIMITS.maxNodes
      ),
      maxDepth: Math.min(
        normalizeLimit(limits.maxDepth, DEFAULT_LIMITS.maxDepth),
        DEFAULT_LIMITS.maxDepth
      ),
    };
  }

  function normalizeFlags(flags, includeIgnoreCase) {
    var seen = {};
    var order = 'dgimsuvy';
    var normalized = '';
    var combined = flags + (includeIgnoreCase ? 'i' : '');
    var index;

    for (index = 0; index < combined.length; index += 1) {
      seen[combined[index]] = true;
    }
    for (index = 0; index < order.length; index += 1) {
      if (seen[order[index]]) {
        normalized += order[index];
        delete seen[order[index]];
      }
    }
    for (index = 0; index < combined.length; index += 1) {
      if (seen[combined[index]]) {
        normalized += combined[index];
        delete seen[combined[index]];
      }
    }
    return normalized;
  }

  function isKnownUnicodeEscape(source, index, flags, inCharacterClass) {
    var lead = source[index + 1];
    if ('dDsSwWfnrtv'.indexOf(lead) !== -1 || lead === 'b') {
      return true;
    }
    if (lead === 'B') {
      return !inCharacterClass;
    }
    if (lead === 'c') {
      return /[A-Za-z]/.test(source[index + 2]);
    }
    if (lead === 'x') {
      return /^[0-9A-Fa-f]{2}/.test(source.slice(index + 2));
    }
    if (lead === 'u') {
      return /^[0-9A-Fa-f]{4}/.test(source.slice(index + 2))
        || /^\{[0-9A-Fa-f]+\}/.test(source.slice(index + 2));
    }
    if (lead === 'p' || lead === 'P') {
      return source[index + 2] === '{'
        && source.indexOf('}', index + 3) !== -1;
    }
    if (lead === 'k') {
      return !inCharacterClass && source[index + 2] === '<';
    }
    if (lead === 'q') {
      return flags.indexOf('v') !== -1
        && inCharacterClass
        && source[index + 2] === '{';
    }
    return !/[A-Za-z]/.test(lead);
  }

  function locateNativeSyntaxError(source, flags, captureGroupCount) {
    if (flags.indexOf('u') === -1 && flags.indexOf('v') === -1) {
      return 0;
    }

    var inCharacterClass = false;
    for (var index = 0; index < source.length; index += 1) {
      var current = source[index];
      if (current === '\\') {
        if (source[index + 1] === '\\') {
          index += 1;
          continue;
        }
        if (/[1-9]/.test(source[index + 1])) {
          if (inCharacterClass) {
            return index;
          }
          var digitEnd = index + 2;
          while (/[0-9]/.test(source[digitEnd])) {
            digitEnd += 1;
          }
          var referenceNumber = Number(
            source.slice(index + 1, digitEnd)
          );
          if (referenceNumber > captureGroupCount) {
            return index;
          }
          index = digitEnd - 1;
          continue;
        }
        if (source[index + 1] === '0'
            && /[0-9]/.test(source[index + 2])) {
          return index;
        }
        if (!isKnownUnicodeEscape(
          source,
          index,
          flags,
          inCharacterClass
        )) {
          return index;
        }
        index += 1;
      } else if (current === '[' && !inCharacterClass) {
        inCharacterClass = true;
      } else if (current === ']' && inCharacterClass) {
        inCharacterClass = false;
      }
    }
    return 0;
  }

  function parseRegexVisualization(source, flags, limits) {
    flags = flags == null ? '' : String(flags);
    var effectiveLimits = normalizeLimits(limits);
    var originalSource = source;
    var sourceOffset = 0;

    try {
      if (typeof source !== 'string') {
        throw new RegexParseError(
          'Regular expression source must be a string',
          0
        );
      }
      if (source.length > effectiveLimits.maxLength) {
        throw new RegexParseError(
          'Regular expression exceeds the length limit',
          effectiveLimits.maxLength,
          {
            limit: effectiveLimits.maxLength,
            length: source.length,
            limitType: 'maxLength',
          }
        );
      }

      if (source.slice(0, 4) === '(?i)') {
        source = source.slice(4);
        sourceOffset = 4;
      }
      flags = normalizeFlags(flags, sourceOffset > 0);

      var metadata = scanRegexMetadata(source);
      var parser = new RegexParser(
        source,
        flags,
        effectiveLimits,
        metadata
      );
      var ast = parser.parse();
      try {
        new RegExp(source, flags);
      } catch (nativeError) {
        throw new RegexParseError(
          'Invalid JavaScript regular expression: '
            + nativeError.message,
          locateNativeSyntaxError(
            source,
            flags,
            parser.captureGroupCount
          ),
          { validationType: 'native' }
        );
      }
      return {
        ok: true,
        originalSource: originalSource,
        source: source,
        flags: flags,
        ast: ast,
        captureGroupCount: parser.captureGroupCount,
      };
    } catch (error) {
      return {
        ok: false,
        originalSource: originalSource,
        error: {
          message: error && error.message
            ? error.message
            : 'Unable to parse regular expression',
          index: typeof error.index === 'number'
            ? error.index + sourceOffset
            : sourceOffset,
          details: error && error.details ? error.details : {},
        },
      };
    }
  }

  return {
    DEFAULT_LIMITS: DEFAULT_LIMITS,
    parseRegexVisualization: parseRegexVisualization,
  };
}));
