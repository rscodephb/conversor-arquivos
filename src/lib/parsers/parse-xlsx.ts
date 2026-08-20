import JSZip from "jszip";

function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

function rowIndex(ref: string): number {
  return Number(/\d+/.exec(ref)?.[0] ?? "1") - 1;
}

function readSharedStrings(xml: string): string[] {
  const documentRef = new DOMParser().parseFromString(xml, "text/xml");
  const items = Array.from(documentRef.getElementsByTagName("si"));
  return items.map((item) => Array.from(item.getElementsByTagName("t")).map((node) => node.textContent ?? "").join(""));
}

function readSheet(xml: string, shared: string[]): string[][] {
  const documentRef = new DOMParser().parseFromString(xml, "text/xml");
  const cells = Array.from(documentRef.getElementsByTagName("c"));
  const grid: string[][] = [];
  for (const cell of cells) {
    const ref = cell.getAttribute("r") ?? "A1";
    const type = cell.getAttribute("t");
    const row = rowIndex(ref);
    const col = columnIndex(ref);
    while (grid.length <= row) grid.push([]);
    while (grid[row].length <= col) grid[row].push("");
    const valueNode = cell.getElementsByTagName("v")[0];
    const inline = cell.getElementsByTagName("t")[0];
    let value = "";
    if (type === "s" && valueNode) value = shared[Number(valueNode.textContent ?? "0")] ?? "";
    else if (type === "inlineStr") value = inline?.textContent ?? "";
    else value = valueNode?.textContent ?? "";
    grid[row][col] = value;
  }
  return grid.length > 0 ? grid : [[""]];
}

export async function parseXlsxToRows(bytes: ArrayBuffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(bytes);
  const sharedFile = zip.file("xl/sharedStrings.xml");
  const shared = sharedFile ? readSharedStrings(await sharedFile.async("string")) : [];
  const sheetFile =
    zip.file("xl/worksheets/sheet1.xml") ??
    Object.values(zip.files).find((file) => file.name.startsWith("xl/worksheets/sheet") && !file.dir);
  if (!sheetFile) throw new Error("Planilha XLSX inválida.");
  return readSheet(await sheetFile.async("string"), shared);
}

function cellRef(row: number, col: number): string {
  let n = col + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function rowsToXlsx(rows: string[][]): Promise<Uint8Array> {
  const zip = new JSZip();
  const normalized = rows.length > 0 ? rows : [[""]];
  const sheetRows = normalized
    .map((row, rowIndexValue) => {
      const cells = row
        .map((value, colIndex) => {
          const text = escapeXml(value);
          return `<c r="${cellRef(rowIndexValue, colIndex)}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndexValue + 1}">${cells}</row>`;
    })
    .join("");
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}
