(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RegexFlowLayout = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_FLOW_OPTIONS = Object.freeze({
    nodeHeight: 40,
    nodeGap: 32,
    branchGap: 36,
    groupPadding: 24,
    canvasPadding: 30,
    maxWidth: 24000,
    maxHeight: 16000,
    maxItems: 5000,
  });

  var idCounter = 0;

  function nextId(prefix) {
    idCounter += 1;
    return prefix + '-' + idCounter;
  }

  function normalizeOptions(options) {
    options = options || {};
    var normalized = {};
    Object.keys(DEFAULT_FLOW_OPTIONS).forEach(function (key) {
      var value = options[key];
      normalized[key] = Number.isFinite(value) && value > 0
        ? value
        : DEFAULT_FLOW_OPTIONS[key];
    });
    return normalized;
  }

  function emptyFragment(width, height) {
    return {
      width: width,
      height: height,
      entry: { x: 0, y: height / 2 },
      exit: { x: width, y: height / 2 },
      nodes: [],
      paths: [],
      groups: [],
      labels: [],
    };
  }

  function translateFragment(fragment, offsetX, offsetY) {
    return {
      width: fragment.width,
      height: fragment.height,
      entry: {
        x: fragment.entry.x + offsetX,
        y: fragment.entry.y + offsetY,
      },
      exit: {
        x: fragment.exit.x + offsetX,
        y: fragment.exit.y + offsetY,
      },
      nodes: fragment.nodes.map(function (node) {
        return Object.assign({}, node, {
          x: node.x + offsetX,
          y: node.y + offsetY,
        });
      }),
      paths: fragment.paths.map(function (path) {
        return Object.assign({}, path, {
          d: translatePath(path.d, offsetX, offsetY),
        });
      }),
      groups: fragment.groups.map(function (group) {
        return Object.assign({}, group, {
          x: group.x + offsetX,
          y: group.y + offsetY,
        });
      }),
      labels: fragment.labels.map(function (label) {
        return Object.assign({}, label, {
          x: label.x + offsetX,
          y: label.y + offsetY,
        });
      }),
    };
  }

  function translatePath(path, offsetX, offsetY) {
    return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, function (_, x, y) {
      return (Number(x) + offsetX) + ',' + (Number(y) + offsetY);
    });
  }

  function appendFragment(target, fragment) {
    target.nodes.push.apply(target.nodes, fragment.nodes);
    target.paths.push.apply(target.paths, fragment.paths);
    target.groups.push.apply(target.groups, fragment.groups);
    target.labels.push.apply(target.labels, fragment.labels);
  }

  function linePath(x1, y1, x2, y2, kind) {
    return {
      id: nextId('path'),
      kind: kind || 'main',
      d: 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2,
    };
  }

  function curvePath(x1, y1, x2, y2, bend, kind) {
    var controlX = Math.max(12, Math.abs(x2 - x1) / 2);
    var direction = x2 >= x1 ? 1 : -1;
    return {
      id: nextId('path'),
      kind: kind,
      d: 'M' + x1 + ',' + y1
        + ' C' + (x1 + controlX * direction) + ',' + (y1 + bend)
        + ' ' + (x2 - controlX * direction) + ',' + (y2 + bend)
        + ' ' + x2 + ',' + y2,
    };
  }

  function estimateTextWidth(text) {
    return Math.max(28, String(text || '').length * 9 + 22);
  }

  function getNodeKind(node) {
    if (node.type === 'literal') return 'literal';
    if (node.type === 'anchor') return 'anchor';
    if (node.type === 'characterClass' || node.type === 'escape' || node.type === 'wildcard') {
      return 'character';
    }
    if (node.type === 'backreference') return 'reference';
    if (node.type === 'legacyEscape') return 'escape';
    return node.type || 'unknown';
  }

  function getNodeLabel(node) {
    var escapeLabels = {
      '\\d': '数字',
      '\\D': '非数字',
      '\\w': '单词字符',
      '\\W': '非单词字符',
      '\\s': '空白字符',
      '\\S': '非空白字符',
      '\\b': '单词边界',
      '\\B': '非单词边界',
      '.': '任意字符',
      '^': '行首',
      '$': '行尾',
    };
    if (escapeLabels[node.raw]) return escapeLabels[node.raw];
    if (node.type === 'characterClass') {
      return node.raw.replace(/^\[\^?/, '').replace(/\]$/, '');
    }
    return node.raw || '空';
  }

  function layoutLeaf(node, options) {
    var label = getNodeLabel(node);
    var width = estimateTextWidth(label);
    var height = options.nodeHeight;
    var fragment = emptyFragment(width, height);
    fragment.nodes.push({
      id: nextId('node'),
      kind: getNodeKind(node),
      raw: node.raw || '',
      label: label,
      description: node.description || '',
      x: 0,
      y: 0,
      width: width,
      height: height,
      quantifier: node.quantifier || null,
    });
    return fragment;
  }

  function layoutSequence(node, options, layoutNode) {
    var children = node.children || [];
    if (!children.length) {
      return emptyFragment(28, options.nodeHeight);
    }

    var fragments = children.map(layoutNode);
    var height = fragments.reduce(function (max, fragment) {
      return Math.max(max, fragment.height);
    }, options.nodeHeight);
    var width = fragments.reduce(function (sum, fragment, index) {
      return sum + fragment.width + (index ? options.nodeGap : 0);
    }, 0);
    var result = emptyFragment(width, height);
    var cursorX = 0;
    var previousExit = null;

    fragments.forEach(function (fragment, index) {
      var translated = translateFragment(
        fragment,
        cursorX,
        (height - fragment.height) / 2
      );
      appendFragment(result, translated);
      if (index && previousExit) {
        result.paths.push(linePath(
          previousExit.x,
          previousExit.y,
          translated.entry.x,
          translated.entry.y,
          'main'
        ));
      }
      if (!index) result.entry = translated.entry;
      previousExit = translated.exit;
      result.exit = translated.exit;
      cursorX += fragment.width + options.nodeGap;
    });

    return result;
  }

  function layoutAlternation(node, options, layoutNode) {
    var branches = (node.children || []).map(layoutNode);
    if (!branches.length) return emptyFragment(28, options.nodeHeight);

    var lead = options.nodeGap;
    var innerWidth = branches.reduce(function (max, branch) {
      return Math.max(max, branch.width);
    }, 0);
    var height = branches.reduce(function (sum, branch, index) {
      return sum + branch.height + (index ? options.branchGap : 0);
    }, 0);
    var width = innerWidth + lead * 2;
    var result = emptyFragment(width, height);
    var centerY = height / 2;
    var cursorY = 0;

    branches.forEach(function (branch) {
      var translated = translateFragment(branch, lead, cursorY);
      appendFragment(result, translated);
      result.paths.push(curvePath(
        0,
        centerY,
        translated.entry.x,
        translated.entry.y,
        translated.entry.y - centerY,
        'branch'
      ));
      result.paths.push(curvePath(
        translated.exit.x,
        translated.exit.y,
        width,
        centerY,
        translated.exit.y - centerY,
        'branch'
      ));
      cursorY += branch.height + options.branchGap;
    });

    result.entry = { x: 0, y: centerY };
    result.exit = { x: width, y: centerY };
    return result;
  }

  function getGroupTitle(node) {
    if (node.groupName) return '命名分组 ' + node.groupName;
    if (node.groupNumber) return '捕获分组 ' + node.groupNumber;
    var titles = {
      nonCapturing: '非捕获分组',
      positiveLookahead: '正向前瞻',
      negativeLookahead: '负向前瞻',
      positiveLookbehind: '正向后瞻',
      negativeLookbehind: '负向后瞻',
    };
    return titles[node.groupKind] || '分组';
  }

  function layoutGroup(node, options, layoutNode) {
    var child = node.children && node.children.length
      ? layoutNode(node.children[0])
      : emptyFragment(28, options.nodeHeight);
    var titleHeight = 24;
    var padding = options.groupPadding;
    var width = child.width + padding * 2;
    var height = child.height + padding * 2 + titleHeight;
    var childY = padding + titleHeight;
    var translated = translateFragment(child, padding, childY);
    var centerY = translated.entry.y;
    var result = emptyFragment(width, height);
    appendFragment(result, translated);
    result.paths.push(linePath(0, centerY, translated.entry.x, translated.entry.y, 'main'));
    result.paths.push(linePath(translated.exit.x, translated.exit.y, width, centerY, 'main'));
    result.groups.push({
      id: nextId('group'),
      kind: node.type === 'assertion' ? 'assertion' : node.type,
      title: getGroupTitle(node),
      x: 2,
      y: 2,
      width: width - 4,
      height: height - 4,
    });
    result.entry = { x: 0, y: centerY };
    result.exit = { x: width, y: centerY };
    return result;
  }

  function getQuantifierText(quantifier) {
    var text;
    if (quantifier.min === quantifier.max) {
      text = quantifier.min + ' 次';
    } else if (quantifier.max === Infinity) {
      text = '至少 ' + quantifier.min + ' 次';
    } else {
      text = quantifier.min + ' 到 ' + quantifier.max + ' 次';
    }
    if (!quantifier.greedy) text += '，优先少匹配';
    return text;
  }

  function applyQuantifier(fragment, quantifier, options) {
    if (!quantifier) return fragment;

    var hasBypass = quantifier.min === 0;
    var hasRepeat = quantifier.max === Infinity
      || (Number.isFinite(quantifier.max) && quantifier.max > quantifier.min);
    var topSpace = hasBypass ? 36 : 0;
    var bottomSpace = hasRepeat ? 48 : 28;
    var translated = translateFragment(fragment, 0, topSpace);
    var result = emptyFragment(fragment.width, fragment.height + topSpace + bottomSpace);
    appendFragment(result, translated);
    result.entry = translated.entry;
    result.exit = translated.exit;

    if (hasBypass) {
      result.paths.push(curvePath(
        translated.entry.x,
        translated.entry.y,
        translated.exit.x,
        translated.exit.y,
        -30,
        'bypass'
      ));
    }
    if (hasRepeat) {
      result.paths.push(curvePath(
        translated.exit.x,
        translated.exit.y,
        translated.entry.x,
        translated.entry.y,
        34,
        'repeat'
      ));
    }
    result.labels.push({
      id: nextId('label'),
      kind: 'quantifier',
      text: getQuantifierText(quantifier),
      x: fragment.width / 2,
      y: result.height - 8,
    });
    return result;
  }

  function createLayoutEngine(options) {
    function layoutNode(node) {
      if (!node) return emptyFragment(28, options.nodeHeight);
      var fragment;
      if (node.type === 'expression' || node.type === 'sequence') {
        fragment = layoutSequence(node, options, layoutNode);
      } else if (node.type === 'alternation') {
        fragment = layoutAlternation(node, options, layoutNode);
      } else if (node.type === 'captureGroup' || node.type === 'group' || node.type === 'assertion') {
        fragment = layoutGroup(node, options, layoutNode);
      } else {
        fragment = layoutLeaf(node, options);
      }
      return applyQuantifier(fragment, node.quantifier, options);
    }
    return layoutNode;
  }

  function countItems(layout) {
    return layout.nodes.length
      + layout.paths.length
      + layout.groups.length
      + layout.labels.length;
  }

  function layoutRegexFlow(ast, userOptions) {
    idCounter = 0;
    var options = normalizeOptions(userOptions);

    try {
      var layoutNode = createLayoutEngine(options);
      var content = layoutNode(ast);
      var endpointSize = 18;
      var endpointGap = 34;
      var contentOffsetX = options.canvasPadding + endpointSize + endpointGap;
      var contentOffsetY = options.canvasPadding;
      var translated = translateFragment(content, contentOffsetX, contentOffsetY);
      var centerY = contentOffsetY + content.height / 2;
      var endX = contentOffsetX + content.width + endpointGap;
      var width = endX + endpointSize + options.canvasPadding;
      var height = content.height + options.canvasPadding * 2;

      translated.nodes.unshift({
        id: nextId('start'),
        kind: 'start',
        raw: '',
        label: '',
        description: '匹配流程开始',
        x: options.canvasPadding,
        y: centerY - endpointSize / 2,
        width: endpointSize,
        height: endpointSize,
        quantifier: null,
      });
      translated.nodes.push({
        id: nextId('end'),
        kind: 'end',
        raw: '',
        label: '',
        description: '匹配流程结束',
        x: endX,
        y: centerY - endpointSize / 2,
        width: endpointSize,
        height: endpointSize,
        quantifier: null,
      });

      translated.paths.unshift(linePath(
        options.canvasPadding + endpointSize,
        centerY,
        translated.entry.x,
        translated.entry.y,
        'main'
      ));
      translated.paths.push(linePath(
        translated.exit.x,
        translated.exit.y,
        endX,
        centerY,
        'main'
      ));

      var result = {
        ok: true,
        width: width,
        height: height,
        nodes: translated.nodes,
        paths: translated.paths,
        groups: translated.groups,
        labels: translated.labels,
      };

      if (width > options.maxWidth || height > options.maxHeight || countItems(result) > options.maxItems) {
        return {
          ok: false,
          error: {
            code: 'FLOW_TOO_LARGE',
            message: '流程图过于复杂，请简化正则表达式。',
          },
        };
      }
      return result;
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'FLOW_LAYOUT_ERROR',
          message: error && error.message ? error.message : '无法生成正则流程图。',
        },
      };
    }
  }

  return {
    DEFAULT_FLOW_OPTIONS: DEFAULT_FLOW_OPTIONS,
    layoutRegexFlow: layoutRegexFlow,
  };
}));
