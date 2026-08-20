# Conversor Offline

Conversor de arquivos **100% no dispositivo** para Windows e Android. Nada é enviado para a nuvem: PDF, imagens, DOCX, ODT, planilhas e texto são processados localmente no app.

Stack: [Tauri 2](https://tauri.app/) + React + TypeScript + Tailwind. As conversões rodam no WebView com bibliotecas JavaScript (`pdf-lib`, PDF.js, mammoth, docx, JSZip).

## Conversões

| Origem | Destino | Qualidade |
|---|---|---|
| PNG, JPG, WEBP, BMP | PDF (um arquivo ou várias imagens juntas) | Alta |
| PDF | PNG / JPG (uma imagem por página) | Alta |
| Vários PDFs | PDF unificado | Alta |
| DOCX / ODT | PDF, DOCX, ODT | Boa para texto, listas, tabelas simples e imagens |
| PDF | DOCX / ODT | Aproximada: texto + imagens; o layout não é 1:1 |
| DOC antigo | PDF / DOCX | Extração de texto |
| TXT, MD, HTML | PDF, DOCX, ODT, HTML, TXT, MD | Alta |
| CSV ↔ XLSX | e PDF | Alta / tabela paginada |

PDF digitalizado (só imagem) entra no Word como imagem. Esta versão não tem OCR.

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://www.rust-lang.org/tools/install) via rustup
- Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) com workload **Desktop development with C++** e Windows SDK
- Android: Android Studio, SDK, NDK e JDK 17+ (`JAVA_HOME` apontando para o JBR 21 do Android Studio funciona)

## Desenvolvimento

```bash
npm install
npm run dev
```

A interface abre em `http://localhost:1420`. O salvamento no navegador usa download local.

App nativo no Windows:

```bash
npm run tauri:dev
```

## Build Windows

Gera o instalador NSIS em `src-tauri/target/release/bundle/nsis/`. O bootstrapper do WebView2 vai embutido.

```bash
npm run tauri:build
```

## Build Android (APK)

Na primeira vez (já feito neste repositório):

```bash
npm run android:init
```

Depois:

```bash
npm run android:build
```

O APK sai em `src-tauri/gen/android/app/build/outputs/apk/`.

Para publicar o APK em um arquivo fixo no Google Drive (o link compartilhado não muda), configure o rclone com um remote `gdrive` e rode:

```bash
npm run android:publish -- -DriveDest "gdrive:Pasta/Conversor-Offline.apk"
```

## Solução de problemas

**`linker link.exe not found`** — instale o workload C++ das Build Tools e abra um terminal novo.

**`Android NDK not found`** — no Android Studio: SDK Manager → SDK Tools → NDK (Side by side) e Android SDK Command-line Tools.

```bash
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set NDK_HOME=%ANDROID_HOME%\ndk\<versao>
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

## Licença

MIT. Ver [LICENSE](LICENSE).
