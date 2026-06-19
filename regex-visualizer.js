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

  function RegexParser(source, limits) {
    this.source = source;
    this.limits = limits;
    this.index = 0;
    this.nodeCount = 0;
    this.depth = 0;
    this.captureGroupCount = 0;
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
        { limit: this.limits.maxNodes }
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

    if (current === '(') {
      return this.parseCaptureGroup();
    }
    if (current === '[') {
      return this.parseCharacterClass();
    }
    if (current === '\\') {
      this.index += 1;
      if (this.index >= this.source.length) {
        throw new RegexParseError('Trailing escape', start);
      }
      this.index += 1;
      return this.createNode(
        'escape',
        start,
        this.index,
        'Escaped token',
        []
      );
    }
    if (current === '^' || current === '$') {
      this.index += 1;
      return this.createNode(
        'anchor',
        start,
        this.index,
        current === '^' ? 'Start anchor' : 'End anchor',
        []
      );
    }

    this.index += 1;
    return this.createNode(
      'literal',
      start,
      this.index,
      'Literal character',
      []
    );
  };

  RegexParser.prototype.parseCaptureGroup = function () {
    var start = this.index;
    this.depth += 1;
    if (this.depth > this.limits.maxDepth) {
      throw new RegexParseError(
        'Regular expression exceeds the depth limit',
        start,
        { limit: this.limits.maxDepth }
      );
    }

    this.captureGroupCount += 1;
    var groupNumber = this.captureGroupCount;
    this.index += 1;

    var child;
    try {
      child = this.parseAlternation();
      if (this.source[this.index] !== ')') {
        throw new RegexParseError('Unclosed capturing group', start);
      }
      this.index += 1;
    } finally {
      this.depth -= 1;
    }

    return this.createNode(
      'captureGroup',
      start,
      this.index,
      'Capturing group ' + groupNumber,
      [child]
    );
  };

  RegexParser.prototype.parseCharacterClass = function () {
    var start = this.index;
    var escaped = false;

    this.index += 1;
    while (this.index < this.source.length) {
      var current = this.source[this.index];
      this.index += 1;

      if (escaped) {
        escaped = false;
      } else if (current === '\\') {
        escaped = true;
      } else if (current === ']') {
        return this.createNode(
          'characterClass',
          start,
          this.index,
          'Character class',
          []
        );
      }
    }

    throw new RegexParseError('Unclosed character class', start);
  };

  function normalizeLimits(limits) {
    limits = limits || {};
    return {
      maxLength: limits.maxLength == null
        ? DEFAULT_LIMITS.maxLength
        : limits.maxLength,
      maxNodes: limits.maxNodes == null
        ? DEFAULT_LIMITS.maxNodes
        : limits.maxNodes,
      maxDepth: limits.maxDepth == null
        ? DEFAULT_LIMITS.maxDepth
        : limits.maxDepth,
    };
  }

  function parseRegexVisualization(source, flags, limits) {
    flags = flags == null ? '' : String(flags);
    var effectiveLimits = normalizeLimits(limits);

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
          { limit: effectiveLimits.maxLength, length: source.length }
        );
      }

      var parser = new RegexParser(source, effectiveLimits);
      var ast = parser.parse();
      return {
        ok: true,
        source: source,
        flags: flags,
        ast: ast,
        captureGroupCount: parser.captureGroupCount,
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error && error.message
            ? error.message
            : 'Unable to parse regular expression',
          index: typeof error.index === 'number' ? error.index : 0,
          details: error && error.details ? error.details : {},
        },
      };
    }
  }

  return {
    DEFAULT_LIMITS: DEFAULT_LIMITS,
    RegexParser: RegexParser,
    parseRegexVisualization: parseRegexVisualization,
  };
}));
