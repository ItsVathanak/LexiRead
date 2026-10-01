# LexiRead

A Chrome extension that makes webpages easier to read for people with dyslexia by swapping page text to dyslexia-friendly fonts (OpenDyslexic and Lexend) and highlighting sentences on hover.

## Features

- **Core**: re-renders page text in a dyslexia-friendly font (CSS-only swap, no page structure changes)
- Two bundled fonts: **OpenDyslexic** (Regular/Bold/Italic/BoldItalic) and **Lexend** (Regular/Bold)
- Adjustable **text size**, **line height**, and **letter spacing**
- **Sentence highlight**: hover over a sentence to highlight it in a color of your choice (default `#A2CB8B`); works across sites and on dynamically loaded content
- **Sound feedback**: short click sounds for toggling LexiRead/highlighting, selecting a font, dragging sliders, and disabling a site (MP3s in `assets/`)
- Master on/off toggle and **per-site disable**
- Settings persist across sessions via `chrome.storage.sync`

## Project structure

```
LexiRead/
├── manifest.json          # MV3 manifest
├── assets/                # UI sound effects (MP3)
├── icons/                 # 16/48/128 PNG icons
└── src/
    ├── content/
    │   └── content.js     # Font swap CSS + sentence wrapping, listens for popup messages
    ├── popup/
    │   ├── popup.html     # Toolbar UI
    │   ├── popup.css      # Hand-written styles (no build step)
    │   └── popup.js       # Reads/writes settings, messages the active tab, plays sounds
    └── fonts/             # Bundled fonts + licenses
```

## Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this `LexiRead/` folder
4. Pin the LexiRead icon and open the popup

## Usage

- **Toggle**: two-state **On/Off** button in the popup header
- **Font**: pick OpenDyslexic or Lexend (previews shown in each font)
- **Text size / line height / letter spacing**: sliders, applied live (changes debounce ~500 ms after you stop dragging)
- **Sentence highlight**: toggle on, pick a highlight color, then hover over sentences to highlight them
- **Sound feedback**: each interaction plays a short click (On/Off, font, sliders, highlight, disable-site)
- **Per-site**: "Disable on this site" adds the current host to an exclusion list

## How the font swap works

The content script (`run_at: document_start`) injects a `<style>` element with `@font-face` rules pointing at the bundled fonts (via `chrome.runtime.getURL`, exposed through `web_accessible_resources`). Fonts are applied with `!important` to block-level text containers scoped under `html.lexiread-active`; inline content inherits, so icon fonts and code blocks are left untouched. Toggling on/off just adds or removes the class.

## How sentence highlighting works

When enabled, the content script walks all text nodes in the page and wraps each sentence (split on `.`, `!`, `?`) in a `<span class="lexiread-sentence">`. A `MutationObserver` re-wraps only newly added or changed subtrees, so dynamically loaded content (e.g. YouTube comments) keeps working. Hovering a sentence fills its background with your chosen color. Skipped content: `script`, `style`, `pre`/`code`, form fields, editable/hidden elements, and already-wrapped spans. Toggling off unwraps everything, restoring the original DOM.

## Sounds

UI sounds live in `assets/` and play only in the popup:

| Trigger              | File             |
| -------------------- | ---------------- |
| LexiRead on          | `toggle-on.mp3`  |
| LexiRead off         | `toggle-off.mp3` |
| Font selected        | `font-select.mp3` |
| Slider drag          | `slider.mp3`     |
| Highlight toggle     | `highlight.mp3`  |
| Disable/enable site  | `disable.mp3`    |

## Licensing

- **OpenDyslexic** — SIL Open Font License 1.1 (see `src/fonts/OpenDyslexic-LICENSE.txt`), by Abbie (Abelardo) Gonzalez.
- **Lexend** — SIL Open Font License 1.1 (see `src/fonts/OFL.txt`).

## Roadmap

- Word/line focus helper (reading ruler)