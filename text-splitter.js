(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TextSplitter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const PUNCTUATION = new Set([
        '.', ',', ';', ':', '!', '?',
        '。', '，', '；', '：', '！', '？',
        '、', '…', '—', '-', ')', '）', ']', '】', '}', '》', '”', '’'
    ]);

    function isNaturalBoundary(char) {
        return /\s/u.test(char) || PUNCTUATION.has(char);
    }

    function findBreakIndex(characters, maxLength) {
        const preferredStart = Math.max(1, Math.floor(maxLength * 0.55));

        for (let index = maxLength; index >= preferredStart; index -= 1) {
            if (isNaturalBoundary(characters[index - 1])) {
                return index;
            }
        }

        return maxLength;
    }

    function splitText(text, maxLength) {
        if (!Number.isInteger(maxLength) || maxLength <= 0) {
            throw new TypeError('maxLength must be a positive integer');
        }

        const source = String(text ?? '');
        if (!source) {
            return [];
        }

        const remaining = Array.from(source);
        const segments = [];

        while (remaining.length > maxLength) {
            const breakIndex = findBreakIndex(remaining, maxLength);
            segments.push(remaining.splice(0, breakIndex).join(''));
        }

        if (remaining.length) {
            segments.push(remaining.join(''));
        }

        return segments;
    }

    function splitTextStrictly(text, maxLength) {
        if (!Number.isInteger(maxLength) || maxLength <= 0) {
            throw new TypeError('maxLength must be a positive integer');
        }

        const characters = Array.from(String(text ?? ''));
        const segments = [];
        for (let index = 0; index < characters.length; index += maxLength) {
            segments.push(characters.slice(index, index + maxLength).join(''));
        }
        return segments;
    }

    function countCharacters(text) {
        return Array.from(String(text ?? '')).length;
    }

    function estimateTokens(text) {
        const source = String(text ?? '');
        if (!source) return 0;
        let tokens = 0;
        const matches = source.match(/[\p{Script=Han}]|[A-Za-z0-9_]+|[^\s]/gu) || [];
        for (const part of matches) {
            if (/^[A-Za-z0-9_]+$/u.test(part)) {
                tokens += Math.ceil(part.length / 4);
            } else {
                tokens += 1;
            }
        }
        return tokens;
    }

    function splitTextByEstimatedTokens(text, maxTokens) {
        if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
            throw new TypeError('maxTokens must be a positive integer');
        }

        const source = String(text ?? '');
        if (!source) {
            return [];
        }

        const characters = Array.from(source);
        const segments = [];
        let start = 0;

        while (start < characters.length) {
            let end = start;
            let lastNaturalEnd = start;
            while (end < characters.length) {
                const next = characters.slice(start, end + 1).join('');
                if (estimateTokens(next) > maxTokens) break;
                end += 1;
                if (isNaturalBoundary(characters[end - 1])) {
                    lastNaturalEnd = end;
                }
            }

            if (end >= characters.length) {
                segments.push(characters.slice(start).join(''));
                break;
            }

            const preferredStart = start + Math.max(1, Math.floor((end - start) * 0.55));
            const breakIndex = lastNaturalEnd >= preferredStart ? lastNaturalEnd : Math.max(start + 1, end);
            segments.push(characters.slice(start, breakIndex).join(''));
            start = breakIndex;
        }

        return segments;
    }

    function splitByUnits(units, limit, measure, fallbackSplit) {
        const segments = [];
        let current = '';

        for (const unit of units) {
            if (!unit) continue;
            if (measure(unit) > limit) {
                if (current) {
                    segments.push(current);
                    current = '';
                }
                segments.push(...fallbackSplit(unit));
                continue;
            }

            if (current && measure(current + unit) > limit) {
                segments.push(current);
                current = unit;
            } else {
                current += unit;
            }
        }

        if (current) {
            segments.push(current);
        }
        return segments;
    }

    function getLineUnits(text) {
        const source = String(text ?? '');
        if (!source) return [];
        return source.match(/[^\n]*(?:\n|$)/g).filter(Boolean);
    }

    function getParagraphUnits(text) {
        const source = String(text ?? '');
        if (!source) return [];
        return source.match(/(?:[^\n]|\n(?!\n))*\n{0,2}/g).filter(Boolean);
    }

    function getSentenceUnits(text) {
        const source = String(text ?? '');
        if (!source) return [];
        const units = source.match(/[^。！？.!?]+[。！？.!?]*\s*/gu);
        return units && units.length ? units : [source];
    }

    function getStrategyUnits(text, strategy) {
        if (strategy === 'lines') return getLineUnits(text);
        if (strategy === 'paragraphs') return getParagraphUnits(text);
        if (strategy === 'sentences') return getSentenceUnits(text);
        return [];
    }

    function splitTextByStrategy(text, maxLength, strategy = 'smart') {
        if (strategy === 'characters') {
            return splitTextStrictly(text, maxLength);
        }
        if (strategy === 'lines' || strategy === 'paragraphs' || strategy === 'sentences') {
            return splitByUnits(
                getStrategyUnits(text, strategy),
                maxLength,
                countCharacters,
                (unit) => splitText(unit, maxLength)
            );
        }
        return splitText(text, maxLength);
    }

    function splitTextByEstimatedTokensWithStrategy(text, maxTokens, strategy = 'smart') {
        if (strategy === 'characters') {
            return splitByUnits(
                Array.from(String(text ?? '')),
                maxTokens,
                estimateTokens,
                (unit) => [unit]
            );
        }
        if (strategy === 'lines' || strategy === 'paragraphs' || strategy === 'sentences') {
            return splitByUnits(
                getStrategyUnits(text, strategy),
                maxTokens,
                estimateTokens,
                (unit) => splitTextByEstimatedTokens(unit, maxTokens)
            );
        }
        return splitTextByEstimatedTokens(text, maxTokens);
    }

    function renderTemplate(template, index, total) {
        return String(template ?? '')
            .replaceAll('{index}', String(index))
            .replaceAll('{total}', String(total));
    }

    function applySegmentTemplates(segments, options = {}) {
        const list = Array.from(segments ?? []);
        const total = list.length;
        const prefix = options.prefix ?? '';
        const suffix = options.suffix ?? '';
        return list.map((segment, index) => (
            `${renderTemplate(prefix, index + 1, total)}${segment}${renderTemplate(suffix, index + 1, total)}`
        ));
    }

    function getCopySegments(segments, options = {}) {
        if (options.includeTemplateInCopy) {
            return applySegmentTemplates(segments, options);
        }
        return Array.from(segments ?? []);
    }

    function findFirstDifference(left, right) {
        const leftChars = Array.from(String(left ?? ''));
        const rightChars = Array.from(String(right ?? ''));
        const length = Math.max(leftChars.length, rightChars.length);
        for (let index = 0; index < length; index += 1) {
            if (leftChars[index] !== rightChars[index]) {
                return {
                    index,
                    left: leftChars[index] ?? '',
                    right: rightChars[index] ?? '',
                };
            }
        }
        return null;
    }

    function validateMergedSegments(source, segments, options = {}) {
        const expected = String(source ?? '');
        const list = options.includeTemplateInValidation
            ? applySegmentTemplates(segments, options)
            : Array.from(segments ?? []);
        const merged = list.join('');
        const difference = findFirstDifference(expected, merged);
        return {
            ok: difference === null,
            sourceLength: countCharacters(expected),
            mergedLength: countCharacters(merged),
            difference,
        };
    }

    function getClipboardHistoryWriteOrder(segments) {
        return Array.from(segments ?? []).reverse();
    }

    return {
        splitText,
        splitTextStrictly,
        countCharacters,
        estimateTokens,
        splitTextByEstimatedTokens,
        splitTextByStrategy,
        splitTextByEstimatedTokensWithStrategy,
        renderTemplate,
        applySegmentTemplates,
        getCopySegments,
        findFirstDifference,
        validateMergedSegments,
        getClipboardHistoryWriteOrder,
    };
});
