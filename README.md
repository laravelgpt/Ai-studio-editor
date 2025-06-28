# 🔥 AI Studio Editor

A web-based, VS Code-style playground built with **Next .js 15 (App Router) + React 18 + TypeScript** that lets you:

* Edit code with the Monaco Editor
* Chat with an AI assistant (powered by Google Gemini via **Genkit**)
* Auto-explain, fix, or autocomplete code fragments
* Run JavaScript snippets inside the browser sandbox
* Create / rename / delete files & folders in a mock in-memory file-system
* Import or export an entire project as a ZIP
* Toggle dark / light themes, search in files, and more

All UI components are built with **Radix UI**, **TailwindCSS**, and **Lucide icons** for a familiar desktop-editor feel.  
The project is licensed under GPL-3.0.

---

## ✨ Features

| Category | Highlights |
| -------- | ---------- |
| **Code Editing** | Monaco Editor with syntax highlighting for JS, TS, TSX, HTML, CSS, JSON & Markdown |
| **AI Toolkit** | `explainCode`, `fixCodeErrors`, `autoCompleteCode`, contextual chat (Gemini 2.0 Flash) :contentReference[oaicite:0]{index=0} |
| **Project Explorer** | Tree view with folder toggling, inline create / delete, mock DB persistence |
| **Execution** | In-browser JS runner with captured console output :contentReference[oaicite:1]{index=1} |
| **Theming** | One-click dark/light switch (next-themes) |
| **Packaging** | Import / export whole project as ZIP (JSZip) |
| **Firebase-ready** | `apphosting.yaml` scaffold for one-command deploy to Firebase App Hosting :contentReference[oaicite:2]{index=2} |

---

## 🏁 Quick start

### 1. Clone & install

```bash
git clone https://github.com/laravelgpt/Ai-studio-editor.git
cd Ai-studio-editor

# with npm
npm install

# or with pnpm
pnpm install
