(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RegexDisplayModel = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var semanticEscapes = {
    d: '数字',
    D: '非数字',
    w: '单词字符',
    W: '非单词字符',
    s: '空白字符',
    S: '非空白字符',
    b: '单词边界',
    B: '非单词边界',
  };

  var controlEscapes = {
    n: '换行',
    r: '回车',
    t: '制表符',
    f: '换页',
    v: '垂直制表符',
    0: '空字符',
  };

  function cloneMetadata(node) {
    var clone = {};
    Object.keys(node).forEach(function (key) {
      if (key !== 'children') clone[key] = node[key];
    });
    clone.children = [];
    clone.characterItems = [];
    clone.displayText = node.raw || '';
    return clone;
  }

  function decodeCodePoint(raw) {
    var value;
    if (/^\\x[0-9A-Fa-f]{2}$/.test(raw)) {
      value = parseInt(raw.slice(2), 16);
    } else if (/^\\u[0-9A-Fa-f]{4}$/.test(raw)) {
      value = parseInt(raw.slice(2), 16);
    } else {
      var match = raw.match(/^\\u\{([0-9A-Fa-f]+)\}$/);
      if (match) value = parseInt(match[1], 16);
    }
    if (!Number.isFinite(value) || value > 0x10FFFF) return null;
    return String.fromCodePoint(value);
  }

  function getEscapeDisplay(node) {
    var raw = node.raw || '';
    if (node.quantifier && node.quantifier.raw && raw.endsWith(node.quantifier.raw)) {
      raw = raw.slice(0, -node.quantifier.raw.length);
    }

    var codePoint = decodeCodePoint(raw);
    if (codePoint !== null) {
      return { text: codePoint, mergeable: true };
    }

    var escaped = raw.slice(1);
    if (semanticEscapes[escaped]) {
      return { text: semanticEscapes[escaped], mergeable: false };
    }
    if (controlEscapes[escaped]) {
      return { text: controlEscapes[escaped], mergeable: false };
    }
    if (raw.length >= 2 && raw[0] === '\\') {
      return { text: escaped, mergeable: escaped.length === 1 };
    }
    return { text: raw, mergeable: false };
  }

  function normalizeCharacterItem(raw) {
    if (!raw) return '';
    if (raw[0] !== '\\') return raw;
    var semantic = semanticEscapes[raw.slice(1)];
    if (semantic) return semantic;
    var control = controlEscapes[raw.slice(1)];
    if (control) return control;
    var codePoint = decodeCodePoint(raw);
    if (codePoint !== null) return codePoint;
    return raw.slice(1);
  }

  function scanCharacterTokens(body) {
    var tokens = [];
    var index = 0;
    while (index < body.length) {
      if (body[index] !== '\\') {
        tokens.push({ raw: body[index], display: body[index], escaped: false });
        index += 1;
        continue;
      }

      var start = index;
      index += 1;
      if (index >= body.length) {
        tokens.push({ raw: '\\', display: '\\', escaped: true });
        break;
      }

      if (body[index] === 'x') {
        index = Math.min(body.length, index + 3);
      } else if (body[index] === 'u' && body[index + 1] === '{') {
        index = body.indexOf('}', index + 2);
        index = index === -1 ? body.length : index + 1;
      } else if (body[index] === 'u') {
        index = Math.min(body.length, index + 5);
      } else {
        index += 1;
      }

      var raw = body.slice(start, index);
      tokens.push({ raw: raw, display: normalizeCharacterItem(raw), escaped: true });
    }
    return tokens;
  }

  function parseCharacterClassItems(raw) {
    var body = raw;
    if (body[0] === '[') body = body.slice(1);
    if (body[body.length - 1] === ']') body = body.slice(0, -1);
    var negated = body[0] === '^';
    if (negated) body = body.slice(1);

    var tokens = scanCharacterTokens(body);
    var items = [];
    var index = 0;
    while (index < tokens.length) {
      var left = tokens[index];
      var dash = tokens[index + 1];
      var right = tokens[index + 2];
      if (
        left
        && dash
        && right
        && dash.raw === '-'
        && !dash.escaped
        && left.raw !== '-'
        && right.raw !== '-'
      ) {
        items.push(left.display + '-' + right.display);
        index += 3;
      } else {
        items.push(left.display);
        index += 1;
      }
    }
    return { items: items.filter(Boolean), negated: negated };
  }

  function isMergeable(node) {
    if (node.quantifier) return false;
    if (node.type === 'literal') return true;
    if (node.type === 'escape' || node.type === 'legacyEscape') {
      return getEscapeDisplay(node).mergeable;
    }
    return false;
  }

  function getLiteralText(node) {
    if (node.type === 'literal') {
      var raw = node.raw || '';
      if (node.quantifier && node.quantifier.raw && raw.endsWith(node.quantifier.raw)) {
        return raw.slice(0, -node.quantifier.raw.length);
      }
      return raw;
    }
    return getEscapeDisplay(node).text;
  }

  function createLiteralRun(nodes) {
    var raw = nodes.map(function (node) { return node.raw || ''; }).join('');
    var decodedRaw = decodeLiteralRun(raw);
    return {
      type: 'literalRun',
      raw: raw,
      displayText: decodedRaw !== null
        ? decodedRaw
        : nodes.map(getLiteralText).join(''),
      start: nodes[0].start,
      end: nodes[nodes.length - 1].end,
      description: '连续字面字符',
      children: [],
      characterItems: [],
      sourceNodes: nodes.map(function (node) {
        return {
          type: node.type,
          raw: node.raw,
          start: node.start,
          end: node.end,
          description: node.description,
        };
      }),
      quantifier: nodes.length === 1 ? nodes[0].quantifier || null : null,
    };
  }

  function decodeLiteralRun(raw) {
    var output = '';
    var index = 0;
    while (index < raw.length) {
      if (raw[index] !== '\\') {
        output += raw[index];
        index += 1;
        continue;
      }

      var remaining = raw.slice(index);
      var unicodeBrace = remaining.match(/^\\u\{([0-9A-Fa-f]+)\}/);
      if (unicodeBrace) {
        var codePoint = parseInt(unicodeBrace[1], 16);
        if (codePoint > 0x10FFFF) return null;
        output += String.fromCodePoint(codePoint);
        index += unicodeBrace[0].length;
        continue;
      }

      var unicode = remaining.match(/^\\u([0-9A-Fa-f]{4})/);
      if (unicode) {
        output += String.fromCodePoint(parseInt(unicode[1], 16));
        index += unicode[0].length;
        continue;
      }

      var hex = remaining.match(/^\\x([0-9A-Fa-f]{2})/);
      if (hex) {
        output += String.fromCodePoint(parseInt(hex[1], 16));
        index += hex[0].length;
        continue;
      }

      if (remaining.length < 2 || semanticEscapes[remaining[1]] || controlEscapes[remaining[1]]) {
        return null;
      }
      output += remaining[1];
      index += 2;
    }
    return output;
  }

  function normalizeSequenceChildren(children) {
    var result = [];
    var literalBuffer = [];

    function flush() {
      if (!literalBuffer.length) return;
      result.push(createLiteralRun(literalBuffer));
      literalBuffer = [];
    }

    children.forEach(function (node) {
      var normalized = normalizeNode(node);
      if (isMergeable(node)) {
        literalBuffer.push(node);
        return;
      }
      flush();
      if (node.type === 'literal' && node.quantifier) {
        normalized.type = 'literalRun';
        normalized.displayText = getLiteralText(node);
        normalized.sourceNodes = [node];
      }
      result.push(normalized);
    });
    flush();
    return result;
  }

  function normalizeNode(node) {
    var normalized = cloneMetadata(node);

    if (node.type === 'sequence') {
      normalized.children = normalizeSequenceChildren(node.children || []);
      normalized.displayText = normalized.children.map(function (child) {
        return child.displayText || child.raw || '';
      }).join('');
      return normalized;
    }

    normalized.children = (node.children || []).map(normalizeNode);

    if (node.type === 'literal') {
      normalized.type = 'literalRun';
      normalized.displayText = getLiteralText(node);
      normalized.sourceNodes = [node];
    } else if (node.type === 'escape' || node.type === 'legacyEscape') {
      normalized.displayText = getEscapeDisplay(node).text;
    } else if (node.type === 'characterClass') {
      var characterRaw = node.raw || '';
      if (node.quantifier && node.quantifier.raw && characterRaw.endsWith(node.quantifier.raw)) {
        characterRaw = characterRaw.slice(0, -node.quantifier.raw.length);
      }
      var characterClass = parseCharacterClassItems(characterRaw);
      normalized.characterItems = characterClass.items;
      normalized.negated = characterClass.negated;
      normalized.displayText = characterClass.negated ? '排除以下字符' : '以下字符之一';
    } else if (node.type === 'anchor') {
      normalized.displayText = node.raw === '^' ? '行首' : '行尾';
    } else if (node.type === 'wildcard') {
      normalized.displayText = '任意字符';
    } else if (node.type === 'backreference') {
      normalized.displayText = node.referenceName
        ? '引用 ' + node.referenceName
        : '引用第 ' + node.referenceNumber + ' 组';
    }

    return normalized;
  }

  function createRegexDisplayModel(ast) {
    if (!ast || typeof ast !== 'object') {
      throw new TypeError('Regex display model requires an AST object');
    }
    return normalizeNode(ast);
  }

  return {
    createRegexDisplayModel: createRegexDisplayModel,
    parseCharacterClassItems: parseCharacterClassItems,
  };
}));
