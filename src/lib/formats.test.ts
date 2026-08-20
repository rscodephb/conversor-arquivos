import { describe, expect, it } from "vitest";
import { detectFileFormat, formatLabel, isRasterFormat } from "@/lib/formats";

function inputFile(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name);
}

describe("detectFileFormat", () => {
  it("maps jpeg extension to jpg", () => {
    const actualFormat = detectFileFormat(inputFile("foto.JPEG"));
    const expectedFormat = "jpg";
    expect(actualFormat).toBe(expectedFormat);
  });
  it("maps htm and markdown aliases", () => {
    expect(detectFileFormat(inputFile("pagina.htm"))).toBe("html");
    expect(detectFileFormat(inputFile("notas.markdown"))).toBe("md");
  });
  it("returns null for an unknown extension", () => {
    const actualFormat = detectFileFormat(inputFile("arquivo.exe"));
    expect(actualFormat).toBeNull();
  });
});

describe("isRasterFormat", () => {
  it("treats webp as raster and pdf as not", () => {
    expect(isRasterFormat("webp")).toBe(true);
    expect(isRasterFormat("pdf")).toBe(false);
  });
});

describe("formatLabel", () => {
  it("labels markdown as Markdown", () => {
    const actualLabel = formatLabel("md");
    const expectedLabel = "Markdown";
    expect(actualLabel).toBe(expectedLabel);
  });
});
