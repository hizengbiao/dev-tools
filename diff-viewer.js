(function (root) {
    const DEFAULT_MAX_MATRIX_CELLS = 1000000;

    function appendDiffSegment(segments, type, text) {
        if (!text) return;
        const previous = segments[segments.length - 1];
        if (previous && previous.type === type) {
            previous.text += text;
            return;
        }
        segments.push({ type, text });
    }

    function buildDiffSegments(original, result, options = {}) {
        const maxMatrixCells = options.maxMatrixCells || DEFAULT_MAX_MATRIX_CELLS;
        if (original === result) {
            return original ? [{ type: 'equal', text: original }] : [];
        }

        let prefixLength = 0;
        while (
            prefixLength < original.length
            && prefixLength < result.length
            && original[prefixLength] === result[prefixLength]
        ) {
            prefixLength += 1;
        }

        let suffixLength = 0;
        while (
            suffixLength < original.length - prefixLength
            && suffixLength < result.length - prefixLength
            && original[original.length - 1 - suffixLength] === result[result.length - 1 - suffixLength]
        ) {
            suffixLength += 1;
        }

        const originalMiddle = original.slice(prefixLength, original.length - suffixLength);
        const resultMiddle = result.slice(prefixLength, result.length - suffixLength);
        const segments = [];
        appendDiffSegment(segments, 'equal', original.slice(0, prefixLength));

        if (originalMiddle.length * resultMiddle.length > maxMatrixCells) {
            appendDiffSegment(segments, 'delete', originalMiddle);
            appendDiffSegment(segments, 'insert', resultMiddle);
        } else {
            const table = Array.from(
                { length: originalMiddle.length + 1 },
                () => new Uint32Array(resultMiddle.length + 1)
            );

            for (let row = originalMiddle.length - 1; row >= 0; row -= 1) {
                for (let column = resultMiddle.length - 1; column >= 0; column -= 1) {
                    table[row][column] = originalMiddle[row] === resultMiddle[column]
                        ? table[row + 1][column + 1] + 1
                        : Math.max(table[row + 1][column], table[row][column + 1]);
                }
            }

            let row = 0;
            let column = 0;
            while (row < originalMiddle.length && column < resultMiddle.length) {
                if (originalMiddle[row] === resultMiddle[column]) {
                    appendDiffSegment(segments, 'equal', originalMiddle[row]);
                    row += 1;
                    column += 1;
                } else if (table[row + 1][column] >= table[row][column + 1]) {
                    appendDiffSegment(segments, 'delete', originalMiddle[row]);
                    row += 1;
                } else {
                    appendDiffSegment(segments, 'insert', resultMiddle[column]);
                    column += 1;
                }
            }

            appendDiffSegment(segments, 'delete', originalMiddle.slice(row));
            appendDiffSegment(segments, 'insert', resultMiddle.slice(column));
        }

        appendDiffSegment(segments, 'equal', original.slice(original.length - suffixLength));
        return segments;
    }

    function createDiffNode(documentRef, text, className = '') {
        const span = documentRef.createElement('span');
        span.textContent = text;
        span.className = className;
        return span;
    }

    const api = {
        buildDiffSegments,
        createDiffNode
    };

    root.DiffViewer = api;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
