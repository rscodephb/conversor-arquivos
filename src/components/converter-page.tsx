import { useMemo, useState } from "react";
import { Download, LoaderCircle, ShieldCheck } from "lucide-react";
import { FileDropzone } from "@/components/file-dropzone";
import { FormatTargetPicker } from "@/components/format-target-picker";
import { OutputNameField } from "@/components/output-name-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConversionHistory } from "@/components/conversion-history";
import { detectFileFormat, formatLabel, MIME_TYPES, type ConversionResult, type FileFormat } from "@/lib/formats";
import { listConversionTargets } from "@/lib/converters/registry";
import { convertFiles } from "@/lib/converters/convert";
import { zipConversionResults } from "@/lib/converters/zip-results";
import { saveBytes } from "@/lib/file-io";
import { openConversionOutput } from "@/lib/open-conversion-output";
import { buildConvertedFilename } from "@/lib/build-converted-filename";
import { extensionOf, stemOf } from "@/lib/bytes";

interface SavedConversion {
  readonly result: ConversionResult;
  readonly savedPath: string | null;
}

export function ConverterPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [target, setTarget] = useState<FileFormat | null>(null);
  const [outputStem, setOutputStem] = useState("");
  const [progress, setProgress] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<SavedConversion | null>(null);
  const [history, setHistory] = useState<SavedConversion | null>(null);

  const sourceFormats = useMemo(
    () => files.map(detectFileFormat).filter((format): format is FileFormat => format !== null),
    [files],
  );
  const options = listConversionTargets(sourceFormats);
  const selected = options.find((option) => option.target === target) ?? options[0] ?? null;
  const outputExtension = selected?.target === "jpeg" ? "jpg" : selected?.target ?? "pdf";

  function archiveCurrentOutput(): void {
    if (lastOutput) setHistory(lastOutput);
    setLastOutput(null);
  }

  async function handleOpen(output: SavedConversion): Promise<void> {
    try {
      await openConversionOutput({
        path: output.savedPath,
        bytes: output.result.bytes,
        mimeType: output.result.mimeType,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível abrir o arquivo.";
      setError(message);
    }
  }

  async function handleConvert(): Promise<void> {
    if (!selected) return;
    setError(null);
    setStatus(null);
    setIsWorking(true);
    setProgress(4);
    try {
      const results = await convertFiles({
        files,
        target: selected.target,
        onProgress: (value) => setProgress(Math.round(value * 90) + 5),
      });
      const output =
        results.length === 1
          ? {
              ...results[0],
              filename: buildConvertedFilename({
                stem: outputStem,
                fallback: results[0].filename,
                extension: extensionOf(results[0].filename),
              }),
            }
          : await zipConversionResults(
              results,
              buildConvertedFilename({
                stem: outputStem,
                fallback: `${stemOf(files[0].name)}-convertido.zip`,
                extension: "zip",
              }),
            );
      setProgress(96);
      const saved = await saveBytes({
        bytes: output.bytes,
        defaultName: output.filename,
        mimeType: output.mimeType ?? MIME_TYPES.zip,
      });
      setProgress(100);
      setLastOutput({ result: output, savedPath: saved.path });
      setStatus(saved.didSave ? null : "Conversão concluída, mas o salvamento foi cancelado.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao converter.";
      setError(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Offline</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Conversor de arquivos</h1>
        <p className="max-w-2xl text-muted">
          Converta documentos e imagens neste computador ou celular, sem internet e sem enviar nada para a nuvem.
        </p>
        <div className="flex items-center gap-2 text-sm text-accent-dark">
          <ShieldCheck className="h-4 w-4" />
          Os arquivos não saem do dispositivo.
        </div>
      </header>
      <Card className="space-y-6 p-4 sm:p-6">
        <FileDropzone
          files={files}
          onFilesChange={(next) => {
            const keptPrevious = files.filter((file) => next.includes(file));
            if (files.length > 0 && keptPrevious.length === 0 && lastOutput) {
              archiveCurrentOutput();
            }
            setFiles(next);
            setTarget(null);
            setOutputStem(next[0] ? stemOf(next[0].name) : "");
            setError(null);
            setStatus(null);
            setProgress(0);
          }}
        />
        {history && (
          <ConversionHistory
            result={history.result}
            isWorking={isWorking}
            onOpen={() => {
              void handleOpen(history);
            }}
            onDownload={() => {
              void saveBytes({
                bytes: history.result.bytes,
                defaultName: history.result.filename,
                mimeType: history.result.mimeType,
              });
            }}
          />
        )}
        <FormatTargetPicker
          options={options}
          selected={selected}
          isWorking={isWorking}
          onSelect={setTarget}
        />
        {files.length > 0 && selected && (
          <OutputNameField
            stem={outputStem}
            extension={outputExtension}
            isDisabled={isWorking}
            onStemChange={setOutputStem}
          />
        )}
        {files.length > 0 && options.length === 0 && (
          <p className="text-sm text-warn">
            Selecione arquivos do mesmo tipo (ou só imagens) para habilitar os destinos.
          </p>
        )}
        {selected?.warning && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-warn">{selected.warning}</p>
        )}
        {isWorking && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted">Convertendo… {progress}%</p>
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        {status && <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-accent-dark">{status}</p>}
        {lastOutput && !status && (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => {
              void handleOpen(lastOutput);
            }}
            className="w-full rounded-xl bg-teal-50 px-3 py-2 text-left text-sm font-medium text-accent-dark underline-offset-2 hover:underline disabled:opacity-50"
          >
            Pronto: {lastOutput.result.filename} — toque para abrir
          </button>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              archiveCurrentOutput();
              setFiles([]);
              setTarget(null);
              setOutputStem("");
              setError(null);
              setStatus(null);
              setProgress(0);
            }}
            disabled={files.length === 0 || isWorking}
          >
            Limpar
          </Button>
          <Button type="button" size="lg" onClick={handleConvert} disabled={!selected || isWorking}>
            {isWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Converter {selected ? `para ${formatLabel(selected.target)}` : ""}
          </Button>
        </div>
      </Card>
      <footer className="text-xs text-muted">
        PDF digitalizado (só imagem) entra no DOCX como imagem, sem OCR. O formato .doc antigo é extração de texto.
      </footer>
    </div>
  );
}
