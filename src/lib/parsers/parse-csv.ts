export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      cell += char;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.length > 0) || rows.length === 0) rows.push(row);
  return rows;
}

export function serializeCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(","),
    )
    .join("\r\n");
}
