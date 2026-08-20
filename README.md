# Conversor de Arquivos Offline

Feito por **R&S CODE**. Conversor **100% no dispositivo** para Windows e Android: nada vai para a nuvem.

**[Baixar Conversor de Arquivos Offline (Android)](https://drive.google.com/file/d/1cMU3g4Zp1OE73N2DOxttwsNpyy2FQfuA/view?usp=sharing)**

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

## Instalação

O `npm install` só baixa as bibliotecas JavaScript. Para o app Windows/Android o Windows ainda precisa de Rust, MSVC e (opcionalmente) Android Studio.

Na pasta do projeto rode:

```bash
npm run setup
```

Isso roda `npm install`, instala Rust (rustup), adiciona os targets Android, tenta as Build Tools C++ via `winget` e, se o Android SDK já existir, baixa o NDK.

O que **não** cabe num `npm install`:

- [Node.js](https://nodejs.org/) 20+ (precisa existir antes)
- [Android Studio](https://developer.android.com/studio) na primeira vez (SDK grande; o `setup` reaproveita se já estiver em `%LOCALAPPDATA%\Android\Sdk`)
- Aceitar o UAC se as Build Tools forem instaladas

## Desenvolvimento

```bash
npm run setup
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

Na primeira vez:

```bash
npm run android:init
```

Depois:

```bash
npm run android:build
```

O APK sai em `src-tauri/gen/android/app/build/outputs/apk/`.

Para republicar o APK no mesmo arquivo do Drive (o link compartilhado não muda):

```bash
npm run android:publish
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

© R&S CODE
