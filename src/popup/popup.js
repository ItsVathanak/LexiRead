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

const $ = (id) => document.getElementById(id);

// Sound effects
const SOUND_FILES = {
  toggleOn: 'assets/toggle-on.mp3',
  toggleOff: 'assets/toggle-off.mp3',
  fontSelect: 'assets/font-select.mp3',
  slider: 'assets/slider.mp3',
  highlight: 'assets/highlight.mp3',
  disable: 'assets/disable.mp3'
};

// Sound effects
const audioCache = {};

// Sound effects
function playSound(name) {
  const src = SOUND_FILES[name];
  if (!src) return;
  let audio = audioCache[name];
  if (!audio) {
    audio = new Audio(chrome.runtime.getURL(src));
    audio.volume = 0.15;
    audioCache[name] = audio;
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Sound effects
let lastSliderSound = 0;

// Sound effects
function playSliderSound() {
  const now = Date.now();
  if (now - lastSliderSound < 120) return;
  lastSliderSound = now;
  playSound('slider');
}

let settings = Object.assign({}, DEFAULT_SETTINGS);
let currentHost = '';

// Debounce
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Debounce
const debouncedSave = debounce(save, 500);

function normalizeHost(host) {
  return (host || '').replace(/^www\./, '').toLowerCase();
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (s) => resolve(Object.assign({}, DEFAULT_SETTINGS, s)));
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      let host = '';
      if (tab && tab.url) {
        try {
          host = normalizeHost(new URL(tab.url).hostname);
        } catch (e) {
          host = '';
        }
      }
      resolve(host);
    });
  });
}

function sendUpdate() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || tab.id == null) return;
    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE', settings }, () => {
      void chrome.runtime.lastError;
    });
  });
}

function save() {
  chrome.storage.sync.set(settings);
  sendUpdate();
  render();
}

function isSiteDisabled() {
  return currentHost && (settings.disabledHostnames || []).indexOf(currentHost) !== -1;
}

function updateLabels() {
  $('fontSize').value = Math.round((Number(settings.fontSize) || 1.0) * 100);
  $('fontSizeValue').textContent = $('fontSize').value + '%';

  $('lineHeight').value = Number(settings.lineHeight) || 1.6;
  $('lineHeightValue').textContent = Number(settings.lineHeight).toFixed(1);

  $('letterSpacing').value = Number(settings.letterSpacing) || 0;
  $('letterSpacingValue').textContent = $('letterSpacing').value + 'px';
}

function render() {
  const stateToggle = $('enabledToggle');
  stateToggle.setAttribute('aria-pressed', String(settings.enabled));
  stateToggle.textContent = settings.enabled ? 'On' : 'Off';

  document.querySelectorAll('.font-card').forEach((card) => {
    const pressed = card.dataset.font === settings.font;
    card.setAttribute('aria-pressed', String(pressed));
  });

  updateLabels();

  const colorInput = $('highlightColor');
  colorInput.value = settings.highlightColor || '#A2CB8B';
  colorInput.disabled = !settings.sentenceHighlight;
  $('sentenceHighlight').checked = !!settings.sentenceHighlight;

  const siteDisabled = isSiteDisabled();
  const toggle = $('siteToggle');
  toggle.textContent = siteDisabled ? 'Enable on this site' : 'Disable on this site';
  toggle.setAttribute('aria-pressed', String(siteDisabled));
  toggle.disabled = !currentHost;

  const status = $('status');
  if (!settings.enabled || siteDisabled) {
    status.dataset.state = 'off';
    status.textContent = 'LexiRead is off for this site';
  } else {
    status.dataset.state = 'on';
    status.textContent = 'LexiRead is on';
  }
}

$('enabledToggle').addEventListener('click', () => {
  settings.enabled = !settings.enabled;
  playSound(settings.enabled ? 'toggleOn' : 'toggleOff');
  save();
});

document.querySelectorAll('.font-card').forEach((card) => {
  card.addEventListener('click', () => {
    settings.font = card.dataset.font;
    playSound('fontSelect');
    save();
  });
});

// Debounce
$('fontSize').addEventListener('input', (e) => {
  settings.fontSize = Number(e.target.value) / 100;
  updateLabels();
  playSliderSound();
  debouncedSave();
});

// Debounce
$('lineHeight').addEventListener('input', (e) => {
  settings.lineHeight = Number(e.target.value);
  updateLabels();
  playSliderSound();
  debouncedSave();
});

// Debounce
$('letterSpacing').addEventListener('input', (e) => {
  settings.letterSpacing = Number(e.target.value);
  updateLabels();
  playSliderSound();
  debouncedSave();
});

$('sentenceHighlight').addEventListener('change', (e) => {
  settings.sentenceHighlight = e.target.checked;
  playSound('highlight');
  save();
});

// Debounce
$('highlightColor').addEventListener('input', (e) => {
  settings.highlightColor = e.target.value;
  debouncedSave();
});

$('siteToggle').addEventListener('click', () => {
  if (!currentHost) return;
  const list = settings.disabledHostnames || [];
  const idx = list.indexOf(currentHost);
  if (idx !== -1) {
    list.splice(idx, 1);
  } else {
    list.push(currentHost);
  }
  settings.disabledHostnames = list;
  playSound('disable');
  save();
});

(async () => {
  settings = await getSettings();
  currentHost = await getActiveTab();
  render();
})();