# File Suite

Developer-first utility box for private, browser-first tools.

## Positioning

Build the wedge around high-frequency developer work:

- JSON Formatter / Validator / Minifier
- JWT Decoder
- Base64 Encode/Decode
- URL Encode/Decode
- Unix Timestamp Converter
- UUID Generator
- Hash Generator
- Regex Tester
- Text Diff / JSON Diff / Prompt Diff
- Cron Expression Parser
- YAML ⇄ JSON
- CSV ⇄ JSON
- XML Formatter

PDF, image, ZIP, EPUB, and podcast tools stay visible in the catalog, but they are secondary to the developer/API/AI-engineering workflow.

## Guarantees

- No cookies for local file/content processing.
- No `localStorage`, `sessionStorage`, or IndexedDB for local file/content processing.
- No uploads or backend processing for strict local tools.
- Files are held in memory as `File`, `Blob`, `ArrayBuffer`, or `Uint8Array`.
- Tool processing is browser-only. Optional Clerk auth requires normal Next/Vercel hosting rather than strict static export.
- Optional cookies are used only for consent and sign-in. Microsoft Clarity loads only after cookie consent.

## AI Boundary

Strict local tools are browser-only.

AI tools such as ebook-to-podcast or site-to-podcast cannot honestly be called 100% offline if they use OpenAI or any hosted model. They must be implemented as a separate **Online AI Mode** with explicit user consent.

Recommended split:

- Local mode: extract/parse files in browser with TypeScript, Web Workers, Rust/C++ WASM, or Python/Pyodide.
- Online AI mode: send only explicitly approved text chunks to a model API.
- Never mix online AI calls into privacy-first tools silently.

## Compiler Boundary

Compiler/runtime tools stay browser-first:

- Pyodide for Python snippets.
- SQLite WASM for SQL.
- TypeScript compiler for transpilation.
- Web Workers for JavaScript snippets.
- Sandboxed iframes for HTML/CSS/JS preview.
- Browser `WebAssembly` APIs for uploaded `.wasm` modules.

Full arbitrary C++/Rust/Go compilers are intentionally not included because free public runners are not reliable production dependencies, and Vercel cannot safely run compiler sandboxes. Add them only if a dedicated self-hosted runner is available.

Current OpenAI guidance:

- Use the Responses API for model requests and reasoning workflows.
- Use `gpt-4o-mini-tts` for text-to-speech / narration workflows.
- Use realtime models only for live voice agents, not offline file-to-audio batch conversion.

## Setup

```bash
cd C:\Projects\POC\filesuite
npm install
npm run dev
```

Optional server features:

- Clerk enables sign-in, votes, emoji reactions, and comments.
- Neon stores tool usage counts, emoji reaction counts, helpful votes, and comments.
- Zoho SMTP sends enquiry form messages.
- Microsoft Clarity is optional and consent-gated through the cookie consent banner.

Copy `.env.example` to `.env.local` and fill the values you want to enable.

Build production output:

```bash
npm run build
```

The production build is emitted to `.next`.

## Routes

```text
/                              Searchable dashboard with tool cards
/tools/json-formatter
/tools/jwt-decoder
/tools/base64-encoder-decoder
/tools/url-encoder-decoder
/tools/unix-timestamp-converter
/tools/uuid-generator
/tools/hash-generator
/tools/regex-tester
/tools/text-diff
/tools/json-diff
/tools/cron-expression-parser
/tools/yaml-json-converter
/tools/csv-json-converter
/tools/xml-formatter
/tools/python-online-compiler
/tools/javascript-online-compiler
/tools/typescript-playground
/tools/html-css-js-live-editor
/tools/sql-online-compiler
/tools/webassembly-runner
/tools/rust-to-wasm-notes
/tools/pdf-merge
/tools/pdf-to-epub
/tools/image-converter
/tools/image-compressor
/tools/image-resizer
/tools/base64-image-converter
/tools/ics-generator
/tools/zip-unzip
/tools/password-generator
/tools/certificate-decoder
```

Every tool route is generated from `components/tool-data.ts`.

## Folder Structure

```text
app/                         Next.js App Router pages and static tool routes
components/                  Dashboard, cards, workspace, sidebar, privacy UI
lib/                         Privacy constants, worker helpers, file limits
utils/                       File, download, and error helpers
modules/pdf/                 PDF APIs, QPDF WASM worker, PDF tool types
modules/image/               Image APIs and WASM-oriented worker
modules/calendar/            Pure TypeScript ICS generator and merger
modules/devtools/            JSON, JWT, cron, YAML, XML, Base64, URL, UUID, hash, regex APIs
modules/filetools/           CSV, Excel, diff, ZIP APIs
wasm/                        WASM integration notes and source-build guidance
public/wasm/                 Runtime-served WASM binaries copied at install time
```

## Latest Implementation Notes

- Brand name in the UI is now **File Suite** with a colored shield logo.
- Dashboard cards show emoji reaction counts and tool usage counts from Neon when configured.
- Every tool action button records a best-effort usage event through `/api/tool-usage`; tool input/output/file content is never stored.
- Tool pages include signed-in helpful votes, emoji reactions, and comments backed by Neon.
- Clerk auth is wired through `proxy.ts` for Next 16.
- Zoho SMTP powers `/api/enquiry`; if SMTP is missing, the form falls back to a prefilled mail draft.
- `/api/admin/health` verifies Clerk/Neon/Zoho configuration when called with `ADMIN_TOKEN`.
- SQL Online Compiler lazy-loads `sql.js` and `/wasm/sql-wasm.wasm`.
- Merge PDFs uses QPDF WASM in a Web Worker with explicit all-page ranges and `.pdf` file picker support.
- Clarity analytics moved out of `layout.tsx` into `components/CookieConsent.tsx` and only loads after consent.

## Execution Strategy

- Small text tools: TypeScript in the browser.
- Heavy text/data tools: Web Worker.
- PDF/image/archive/tokenizer tools: Rust/C++ WASM inside Web Workers.
- Python only via Pyodide, loaded statically and run inside workers.
- No persistent browser storage.

## Deployment

### Vercel

1. Set project root to this repo.
2. Build command: `npm run build`.
3. Add the Clerk, Neon, Zoho, Clarity, and admin values from `.env.example` when you want account-backed engagement, email, diagnostics, and consent-gated analytics.
4. Do not create API routes or server actions for local file/content processing.

Important env keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `ZOHO_SMTP_HOST`
- `ZOHO_SMTP_PORT`
- `ZOHO_SMTP_SECURE`
- `ZOHO_SMTP_USER`
- `ZOHO_SMTP_PASS`
- `CONTACT_FROM_EMAIL`
- `CONTACT_TO_EMAIL`
- `NEXT_PUBLIC_CLARITY_ID`
- `ADMIN_TOKEN`

Admin health check:

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://filesuite.dev/api/admin/health
curl -H "Authorization: Bearer <ADMIN_TOKEN>" "https://filesuite.dev/api/admin/health?verifyMail=true"
```

### Cloudflare Pages

1. Root directory: this repo.
2. Build command: `npm run build`.
3. Use static Pages only if Clerk is disabled.
4. For Clerk auth, deploy with a Next-compatible runtime.

## Roadmap

Phase 1:

- Finish keyboard-first UX: copy, clear, sample, download, auto-format on paste.
- Add JWT signature verification with user-supplied secret/public key.
- Move regex/diff for very large text into workers.

Phase 2:

- OpenAPI validator.
- cURL to C# / JS / Python converter.
- SQL formatter.
- Certificate decoder.

Phase 3:

- LLM token estimator via WASM tokenizer.
- JSON Schema generator.
- RAG chunk-size calculator.
- PDF to EPUB using MuPDF/PDFium WASM plus EPUB packaging.

Phase 4:

- Online AI Mode for ebook/site to podcast with explicit consent, user-provided API key or a minimal proxy, and clear data-transfer labeling.
