// @ts-ignore
window.ARCHIVE_CHAT_OVERRIDE = true;
// @ts-ignore
window.HOLODEX_PLUS_INSTALLED = true;
// @ts-ignore
window.VtuberVN_PLUS_INSTALLED_V3 = true;
// @ts-ignore — Audio Visualizer: notify main web app that extension supports audio data capture
window.VtuberVN_AUDIO_VISUALIZER_SUPPORTED = true;

if (!import.meta.env.DEV) {
  const _log = console.log;
  console.log = (...args: any[]) => {
    if (args.length > 0 && typeof args[0] === 'string' && (args[0].includes('[VtuberVN+]') || args[0].includes('[VtuberVN+ Lite]'))) {
      return;
    }
    _log(...args);
  };
}

console.log("[VtuberVN+] Activated");

// ─── Audio Visualizer Bridge ──────────────────────────────────────
// Relay audio data from YouTube embed iframes to main page context.
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data?.type) return;

  // Forward audio data, ACK, and heartbeat from iframe to main page via CustomEvent
  if (data.type === 'VTUBERVN_AUDIO_DATA' || data.type === 'VTUBERVN_AUDIO_CAPTURE_ACK' || data.type === 'VTUBERVN_AUDIO_CAPTURE_HEARTBEAT') {
    window.dispatchEvent(new CustomEvent('vtubervn-audio-data', {
      detail: data,
    }));
  }
});

// ─── Locale Sync (popup i18n) ─────────────────────────────────────
function detectAndSyncLocale() {
  const htmlLang = document.documentElement.lang;
  const storedLocale = localStorage.getItem('i18n_redirected');
  const locale = htmlLang || storedLocale || navigator.language.split('-')[0] || 'vi';
  const normalized = locale.startsWith('vi') ? 'vi' : 'en';
  window.postMessage({ type: 'VTUBERVN_LOCALE_SYNC', locale: normalized }, '*');
}

detectAndSyncLocale();

const localeObserver = new MutationObserver(() => {
  detectAndSyncLocale();
});
localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

window.addEventListener('storage', (e) => {
  if (e.key === 'vtubervn_locale' && e.newValue) {
    window.postMessage({ type: 'VTUBERVN_LOCALE_SYNC', locale: e.newValue }, '*');
  }
});

// Theme Sync
function detectAndSyncTheme() {
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.body?.classList.contains('dark') ||
                 !document.documentElement.classList.contains('light');
  
  const computedStyle = getComputedStyle(document.documentElement);
  const primaryRgb = computedStyle.getPropertyValue('--v-theme-primary').trim() || '235, 143, 225';
  
  window.postMessage({
    type: 'VTUBERVN_THEME_SYNC',
    theme: {
      isDark,
      primaryRgb,
    }
  }, '*');
}

detectAndSyncTheme();

const themeObserver = new MutationObserver(() => {
  detectAndSyncTheme();
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

export {};

