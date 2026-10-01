const STYLE_ID = 'lexiread-style';
const ACTIVE_CLASS = 'lexiread-active';

const SENTENCE_STYLE_ID = 'lexiread-sentence-style';
const SENTENCE_CLASS = 'lexiread-sentence';
const SENTENCE_HTML_CLASS = 'lexiread-sentences';

const WRAP_SKIP_SELECTOR = [
  'script', 'style', 'noscript',
  'textarea', 'input', 'select',
  'pre', 'code', 'kbd', 'samp',
  '[contenteditable]',
  '[aria-hidden]',
  '[hidden]',
  '.' + SENTENCE_CLASS
].join(',');

const SENTENCE_RE = /[^.!?]+[.!?]+["')\]]*(\s+|$)/g;

const DEFAULT_SETTINGS = {
  enabled: true,
  font: 'opendyslexic',
  fontSize: 1.0,
  lineHeight: 1.6,
  letterSpacing: 0,
  disabledHostnames: [],
  sentenceHighlight: false,
  highlightColor: '#A2CB8B'
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

let sentenceActive = false;
let sentenceObserver = null;
let isWrapping = false;
let pendingNodes = new Set();
let wrapTimer = null;
let pendingRunHandler = null;

function buildSentenceCSS(color) {
  const c = color || '#A2CB8B';
  return `html.lexiread-sentences .lexiread-sentence:hover { background-color: ${c} !important; }`;
}

function ensureSentenceStyle() {
  let style = document.getElementById(SENTENCE_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = SENTENCE_STYLE_ID;
    (document.head || document.documentElement).appendChild(style);
  }
  return style;
}

function wrapTextNode(node) {
  const text = node.nodeValue;
  if (!text || !/\S/.test(text)) return;

  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  const re = new RegExp(SENTENCE_RE.source, SENTENCE_RE.flags);
  let m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
    }
    const span = document.createElement('span');
    span.className = SENTENCE_CLASS;
    span.textContent = m[0];
    frag.appendChild(span);
    lastIndex = m.index + m[0].length;
  }

  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex);
    if (/\S/.test(remainder)) {
      const span = document.createElement('span');
      span.className = SENTENCE_CLASS;
      span.textContent = remainder;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(remainder));
    }
  }

  node.parentNode.replaceChild(frag, node);
}

function acceptTextNode(node) {
  const parent = node.parentElement;
  if (!parent) return NodeFilter.FILTER_REJECT;
  if (parent.closest(WRAP_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
  if (parent.closest('.' + SENTENCE_CLASS)) return NodeFilter.FILTER_REJECT;
  return NodeFilter.FILTER_ACCEPT;
}

function wrapSubtree(root) {
  if (isWrapping) return;
  isWrapping = true;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: acceptTextNode });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(wrapTextNode);
  } finally {
    isWrapping = false;
  }
}

function wrapSentences() {
  if (document.body) wrapSubtree(document.body);
}

function unwrapSentences() {
  document.querySelectorAll('.' + SENTENCE_CLASS).forEach((span) => {
    span.replaceWith(document.createTextNode(span.textContent));
  });
}

function scheduleSubtreeWrap(node) {
  pendingNodes.add(node);
  if (wrapTimer) return;
  wrapTimer = setTimeout(() => {
    wrapTimer = null;
    const batch = pendingNodes;
    pendingNodes = new Set();
    batch.forEach((n) => wrapSubtree(n));
  }, 150);
}

function startSentenceObserver() {
  if (sentenceObserver || !document.body) return;
  sentenceObserver = new MutationObserver((mutations) => {
    if (!sentenceActive || isWrapping) return;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent) scheduleSubtreeWrap(parent);
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.closest(WRAP_SKIP_SELECTOR)) continue;
        if (node.closest('.' + SENTENCE_CLASS)) continue;
        scheduleSubtreeWrap(node);
      }
    }
  });
  sentenceObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopSentenceObserver() {
  if (sentenceObserver) {
    sentenceObserver.disconnect();
    sentenceObserver = null;
  }
  if (wrapTimer) {
    clearTimeout(wrapTimer);
    wrapTimer = null;
  }
  pendingNodes = new Set();
}

function applySentences(s, shouldRun) {
  const active = shouldRun && !!s.sentenceHighlight;

  if (active) {
    if (!sentenceActive) {
      sentenceActive = true;
      ensureSentenceStyle().textContent = buildSentenceCSS(s.highlightColor);
      document.documentElement.classList.add(SENTENCE_HTML_CLASS);
      const run = () => {
        if (!sentenceActive) return;
        wrapSentences();
        startSentenceObserver();
      };
      if (document.body) {
        run();
      } else {
        pendingRunHandler = run;
        document.addEventListener('DOMContentLoaded', pendingRunHandler, { once: true });
      }
    } else {
      const style = document.getElementById(SENTENCE_STYLE_ID);
      if (style) style.textContent = buildSentenceCSS(s.highlightColor);
    }
  } else if (sentenceActive) {
    sentenceActive = false;
    if (pendingRunHandler) {
      document.removeEventListener('DOMContentLoaded', pendingRunHandler);
      pendingRunHandler = null;
    }
    document.documentElement.classList.remove(SENTENCE_HTML_CLASS);
    const style = document.getElementById(SENTENCE_STYLE_ID);
    if (style) style.remove();
    unwrapSentences();
    stopSentenceObserver();
  }
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

  applySentences(s, shouldRun);
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