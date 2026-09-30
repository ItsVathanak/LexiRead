const DEFAULT_SETTINGS = {
  enabled: true,
  font: 'opendyslexic',
  fontSize: 1.0,
  lineHeight: 1.6,
  letterSpacing: 0,
  disabledHostnames: []
};

const $ = (id) => document.getElementById(id);

let settings = Object.assign({}, DEFAULT_SETTINGS);
let currentHost = '';

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

function render() {
  $('enabled').checked = settings.enabled;

  document.querySelectorAll('.font-card').forEach((card) => {
    const pressed = card.dataset.font === settings.font;
    card.setAttribute('aria-pressed', String(pressed));
  });

  $('fontSize').value = Math.round((Number(settings.fontSize) || 1.0) * 100);
  $('fontSizeValue').textContent = $('fontSize').value + '%';

  $('lineHeight').value = Number(settings.lineHeight) || 1.6;
  $('lineHeightValue').textContent = Number(settings.lineHeight).toFixed(1);

  $('letterSpacing').value = Number(settings.letterSpacing) || 0;
  $('letterSpacingValue').textContent = $('letterSpacing').value + 'px';

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

$('enabled').addEventListener('change', (e) => {
  settings.enabled = e.target.checked;
  save();
});

document.querySelectorAll('.font-card').forEach((card) => {
  card.addEventListener('click', () => {
    settings.font = card.dataset.font;
    save();
  });
});

$('fontSize').addEventListener('input', (e) => {
  settings.fontSize = Number(e.target.value) / 100;
  save();
});

$('lineHeight').addEventListener('input', (e) => {
  settings.lineHeight = Number(e.target.value);
  save();
});

$('letterSpacing').addEventListener('input', (e) => {
  settings.letterSpacing = Number(e.target.value);
  save();
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
  save();
});

(async () => {
  settings = await getSettings();
  currentHost = await getActiveTab();
  render();
})();