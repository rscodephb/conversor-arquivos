import type { ConversionOption, FileFormat } from "@/lib/formats";
import { isRasterFormat } from "@/lib/formats";

const APPROXIMATE =
  "O conteúdo é extraído neste dispositivo, mas o layout pode ficar diferente do original.";
const GOOD_OFFICE =
  "Textos, listas, tabelas simples e imagens são preservados; layouts complexos podem ser simplificados.";
const DOC_WARNING =
  "Arquivos .doc antigos são convertidos por extração de texto. A formatação original é limitada.";
const TABLE_PDF = "A planilha vira uma tabela paginada em PDF.";

function documentTargets(warning?: string, fidelity: ConversionOption["fidelity"] = "good"): ConversionOption[] {
  return [
    { target: "pdf", label: "PDF", fidelity, warning },
    { target: "odt", label: "ODT", fidelity, warning },
    { target: "docx", label: "DOCX", fidelity, warning },
    { target: "html", label: "HTML", fidelity: "high" },
    { target: "txt", label: "TXT", fidelity: "high" },
    { target: "md", label: "Markdown", fidelity: "good", warning: GOOD_OFFICE },
  ];
}

function withoutSameFormat(options: ConversionOption[], source: FileFormat): ConversionOption[] {
  return options.filter((option) => option.target !== source && !(source === "htm" && option.target === "html"));
}

export function listConversionTargets(sourceFormats: FileFormat[]): ConversionOption[] {
  if (sourceFormats.length === 0) return [];
  const unique = Array.from(new Set(sourceFormats));
  const allRaster = unique.every((format) => isRasterFormat(format));
  const allPdf = unique.every((format) => format === "pdf");
  const singleKind = unique.length === 1 ? unique[0] : null;
  if (allRaster) {
    return [
      { target: "pdf", label: "PDF", fidelity: "high" },
      { target: "png", label: "PNG", fidelity: "high" },
      { target: "jpg", label: "JPG", fidelity: "high" },
    ];
  }
  if (allPdf) {
    const options: ConversionOption[] = [
      { target: "odt", label: "ODT", fidelity: "approximate", warning: APPROXIMATE },
      { target: "docx", label: "DOCX", fidelity: "approximate", warning: APPROXIMATE },
      { target: "png", label: "PNG", fidelity: "high" },
      { target: "jpg", label: "JPG", fidelity: "high" },
      { target: "html", label: "HTML", fidelity: "approximate", warning: APPROXIMATE },
      { target: "txt", label: "TXT", fidelity: "approximate", warning: APPROXIMATE },
      { target: "md", label: "Markdown", fidelity: "approximate", warning: APPROXIMATE },
    ];
    if (sourceFormats.length > 1) {
      options.unshift({ target: "pdf", label: "Unir PDFs", fidelity: "high", isMerge: true });
    }
    return options;
  }
  if (!singleKind) return [];
  if (singleKind === "docx") return withoutSameFormat(documentTargets(GOOD_OFFICE), "docx");
  if (singleKind === "odt") return withoutSameFormat(documentTargets(GOOD_OFFICE), "odt");
  if (singleKind === "doc") {
    return documentTargets(DOC_WARNING, "approximate");
  }
  if (singleKind === "txt" || singleKind === "md" || singleKind === "html" || singleKind === "htm") {
    return withoutSameFormat(documentTargets(undefined, "high"), singleKind === "htm" ? "html" : singleKind);
  }
  if (singleKind === "csv") {
    return [
      { target: "pdf", label: "PDF", fidelity: "good", warning: TABLE_PDF },
      { target: "xlsx", label: "XLSX", fidelity: "high" },
      { target: "html", label: "HTML", fidelity: "high" },
      { target: "txt", label: "TXT", fidelity: "high" },
    ];
  }
  if (singleKind === "xlsx") {
    return [
      { target: "pdf", label: "PDF", fidelity: "good", warning: TABLE_PDF },
      { target: "csv", label: "CSV", fidelity: "high" },
      { target: "html", label: "HTML", fidelity: "high" },
      { target: "txt", label: "TXT", fidelity: "high" },
    ];
  }
  return [];
}
