import { describe, expect, it } from "vitest";
import { bytesToArrayBuffer } from "@/lib/bytes";
import { convertFiles } from "@/lib/converters/convert";
import { parseCsv } from "@/lib/parsers/parse-csv";

function inputTextFile(name: string, content: string, mimeType: string): File {
  return new File([content], name, { type: mimeType });
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function ignoreProgress(_value: number): void {
  return;
}

describe("convertFiles", () => {
  it("roundtrips csv through xlsx", async () => {
    const inputCsv = "nome,idade\r\nAna,30\r\n\"Bo,b\",41";
    const inputFiles = [inputTextFile("dados.csv", inputCsv, "text/csv")];
    const [xlsx] = await convertFiles({
      files: inputFiles,
      target: "xlsx",
      onProgress: ignoreProgress,
    });
    expect(xlsx.filename).toBe("dados.xlsx");
    expect(xlsx.mimeType).toContain("spreadsheet");
    expect(decodeText(xlsx.bytes.slice(0, 2))).toBe("PK");
    const xlsxFile = new File([bytesToArrayBuffer(xlsx.bytes)], xlsx.filename);
    const [csv] = await convertFiles({
      files: [xlsxFile],
      target: "csv",
      onProgress: ignoreProgress,
    });
    const actualRows = parseCsv(decodeText(csv.bytes));
    const expectedRows = parseCsv(inputCsv);
    expect(actualRows).toEqual(expectedRows);
  });
  it("emits a valid pdf from plain text", async () => {
    const inputFiles = [inputTextFile("nota.txt", "Ola mundo", "text/plain")];
    const [pdf] = await convertFiles({
      files: inputFiles,
      target: "pdf",
      onProgress: ignoreProgress,
    });
    const actualHeader = decodeText(pdf.bytes.subarray(0, 5));
    expect(pdf.filename).toBe("nota.pdf");
    expect(actualHeader).toBe("%PDF-");
    expect(pdf.bytes.byteLength).toBeGreaterThan(200);
  }, 30_000);
  it("rejects an unsupported extension", async () => {
    const inputFiles = [inputTextFile("setup.exe", "not-a-document", "application/octet-stream")];
    await expect(
      convertFiles({
        files: inputFiles,
        target: "pdf",
        onProgress: ignoreProgress,
      }),
    ).rejects.toThrow("extensão não suportada");
  });
});
