# LexiRead

A Chrome extension that makes webpages easier to read for people with dyslexia by swapping page text to dyslexia-friendly fonts (OpenDyslexic and Lexend).

## Features

- **Core**: re-renders page text in a dyslexia-friendly font (CSS-only swap, no page structure changes)
- Two bundled fonts: **OpenDyslexic** (Regular/Bold/Italic/BoldItalic) and **Lexend** (Regular/Bold)
- Adjustable **text size**, **line height**, and **letter spacing**
- Master on/off toggle and **per-site disable**
- Settings persist across sessions via `chrome.storage.sync`

## Project structure

```
LexiRead/
├── manifest.json          # MV3 manifest
├── icons/                 # 16/48/128 PNG icons
└── src/
    ├── content/
    │   └── content.js     # Injects @font-face + font-swap CSS, listens for popup messages
    ├── popup/
    │   ├── popup.html     # Toolbar UI
    │   ├── popup.css      # Hand-written styles (no build step)
    │   └── popup.js       # Reads/writes settings, messages the active tab
    └── fonts/             # Bundled fonts + licenses
```

## Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this `LexiRead/` folder
4. Pin the LexiRead icon and open the popup

## Usage

- **Toggle**: master on/off switch in the popup header
- **Font**: pick OpenDyslexic or Lexend (previews shown in each font)
- **Text size / line height / letter spacing**: sliders, applied live
- **Per-site**: "Disable on this site" adds the current host to an exclusion list

## How the font swap works

The content script (`run_at: document_start`) injects a `<style>` element with `@font-face` rules pointing at the bundled fonts (via `chrome.runtime.getURL`, exposed through `web_accessible_resources`). Fonts are applied with `!important` to block-level text containers scoped under `html.lexiread-active`; inline content inherits, so icon fonts and code blocks are left untouched. Toggling on/off just adds or removes the class.

## Licensing

- **OpenDyslexic** — SIL Open Font License 1.1 (see `src/fonts/OpenDyslexic-LICENSE.txt`), by Abbie (Abelardo) Gonzalez.
- **Lexend** — SIL Open Font License 1.1 (see `src/fonts/OFL.txt`).

## Roadmap

- Sentence hover-highlighting (experimental, opt-in)
- Word/line focus helper (reading ruler)