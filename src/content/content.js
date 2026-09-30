const STYLE_ID = 'lexiread-style';
const ACTIVE_CLASS = 'lexiread-active';

const DEFAULT_SETTINGS = {
  enabled: true,
  font: 'opendyslexic',
  fontSize: 1.0,
  lineHeight: 1.6,
  letterSpacing: 0,
  disabledHostnames: []
};

const FONT_FAMILIES = {
  opendyslexic: {
    family: 'OpenDyslexic',
    fallback: "'OpenDyslexic', 'Lexend', system-ui, sans-serif",
    faces: [
      { weight: 400, style: 'normal', file: 'OpenDyslexic-Regular.otf', format: 'opentype' },
      { weight: 700, style: 'normal', file: 'OpenDyslexic-Bold.otf', format: 'opentype' },
      { weight: 400, style: 'italic', file: 'OpenDyslexic-Italic.otf', format: 'opentype' },
      { weight: 700, style: 'italic', file: 'OpenDyslexic-BoldItalic.otf', format: 'opentype' }
    ]
  },
  lexend: {
    family: 'Lexend',
    fallback: "'Lexend', system-ui, sans-serif",
    faces: [
      { weight: 400, style: 'normal', file: 'Lexend-Regular.ttf', format: 'truetype' },
      { weight: 700, style: 'normal', file: 'Lexend-Bold.ttf', format: 'truetype' }
    ]
  }
};

const TEXT_SELECTOR = [
  'body',
  'p',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li',
  'td', 'th',
  'blockquote',
  'figcaption',
  'dd', 'dt',
  'summary',
  'label',
  'button',
  'caption',
  'legend',
  'address'
].join(',');

const SIZE_SELECTOR = [
  'body',
  'p',
  'li',
  'td', 'th',
  'blockquote',
  'figcaption',
  'dd', 'dt',
  'summary',
  'label',
  'button',
  'caption'
].join(',');

function buildFontFaceCSS(fontKey) {
  const font = FONT_FAMILIES[fontKey] || FONT_FAMILIES.opendyslexic;
  return font.faces
    .map(
      (f) => `@font-face {
  font-family: '${font.family}';
  src: url('${chrome.runtime.getURL('src/fonts/' + f.file)}') format('${f.format}');
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`
    )
    .join('\n');
}

function buildStyle(s) {
  const font = FONT_FAMILIES[s.font] || FONT_FAMILIES.opendyslexic;
  const fs = Number(s.fontSize) || 1.0;
  const lh = Number(s.lineHeight) || 1.6;
  const ls = Number(s.letterSpacing) || 0;
  return (
    buildFontFaceCSS(s.font) +
    `
html.lexiread-active ${TEXT_SELECTOR} {
  font-family: ${font.fallback} !important;
  line-height: ${lh} !important;
  letter-spacing: ${ls}px !important;
}
html.lexiread-active ${SIZE_SELECTOR} {
  font-size: calc(1rem * ${fs}) !important;
}`
  );
}

function ensureStyle() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  return style;
}

function isDisabledHost(host, disabledHostnames) {
  const list = disabledHostnames || [];
  const normalized = (host || '').replace(/^www\./, '').toLowerCase();
  return list.some((h) => {
    if (!h) return false;
    const entry = h.replace(/^www\./, '').toLowerCase();
    return normalized === entry || normalized.endsWith('.' + entry);
  });
}

function apply(settings) {
  const s = Object.assign({}, DEFAULT_SETTINGS, settings);
  const shouldRun = !!s.enabled && !isDisabledHost(location.hostname, s.disabledHostnames);

  if (shouldRun) {
    ensureStyle().textContent = buildStyle(s);
    document.documentElement.classList.add(ACTIVE_CLASS);
  } else {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
    document.documentElement.classList.remove(ACTIVE_CLASS);
  }
}

chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => apply(s));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => apply(s));
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'UPDATE') {
    apply(msg.settings || {});
    sendResponse({ ok: true });
  }
});