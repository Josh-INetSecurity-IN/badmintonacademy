"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCSV = toCSV;
function toCSV(headers, rows) {
    const escape = (val) => {
        const str = val === null || val === undefined ? '' : String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };
    const lines = [headers.map(escape).join(',')];
    for (const row of rows) {
        lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
}
//# sourceMappingURL=csv.js.map