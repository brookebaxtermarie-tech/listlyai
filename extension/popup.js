const API_BASE = 'https://listlyai-photo.vercel.app';

const PLATFORM_MAP = [
  { key: 'vinted',        label: 'Vinted',        hosts: ['vinted.fr','vinted.com','vinted.co.uk','vinted.de','vinted.es','vinted.pl','vinted.nl','vinted.be','vinted.it','vinted.lu','vinted.pt'] },
  { key: 'ebay',          label: 'eBay',           hosts: ['ebay.com','ebay.co.uk','ebay.fr','ebay.de','ebay.it','ebay.es','ebay.com.au'] },
  { key: 'depop',         label: 'Depop',          hosts: ['depop.com'] },
  { key: 'poshmark',      label: 'Poshmark',       hosts: ['poshmark.com'] },
  { key: 'mercari',       label: 'Mercari',        hosts: ['mercari.com'] },
  { key: 'leboncoin',     label: 'Leboncoin',      hosts: ['leboncoin.fr'] },
  { key: 'wallapop',      label: 'Wallapop',       hosts: ['wallapop.com'] },
  { key: 'kleinanzeigen', label: 'Kleinanzeigen',  hosts: ['kleinanzeigen.de'] },
  { key: 'allegro',       label: 'Allegro',        hosts: ['allegro.pl'] },
];

// ── State ─────────────────────────────────────────────────────────
let listings = [];
let currentListing = null;
let currentPlatform = null;

// ── DOM refs ──────────────────────────────────────────────────────
const screens = {
  settings: document.getElementById('screen-settings'),
  connect:  document.getElementById('screen-connect'),
  loading:  document.getElementById('screen-loading'),
  error:    document.getElementById('screen-error'),
  empty:    document.getElementById('screen-empty'),
  main:     document.getElementById('screen-main'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// ── Platform detection ────────────────────────────────────────────
async function detectPlatform() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab?.url) return resolve(null);
      try {
        const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
        for (const p of PLATFORM_MAP) {
          if (p.hosts.some(h => hostname === h || hostname.endsWith('.' + h))) {
            return resolve(p);
          }
        }
      } catch {}
      resolve(null);
    });
  });
}

// ── API ───────────────────────────────────────────────────────────
async function fetchListings(apiKey) {
  const res = await fetch(`${API_BASE}/api/extension/listings`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  return json.listings ?? [];
}

// ── Render ────────────────────────────────────────────────────────
function renderListing(listing, platform) {
  const desc = platform
    ? (listing.descriptions?.[platform.key] ?? listing.descriptions?.[Object.keys(listing.descriptions ?? {})[0]] ?? '')
    : (listing.descriptions?.[Object.keys(listing.descriptions ?? {})[0]] ?? '');

  document.getElementById('val-title').textContent = listing.title ?? '—';
  document.getElementById('val-price').textContent = listing.price != null ? `€${listing.price}` : '—';
  document.getElementById('val-condition').textContent = listing.condition ?? '—';
  document.getElementById('val-tags').textContent = (listing.tags ?? []).join(', ') || '—';
  document.getElementById('val-description').textContent = desc || '—';

  const platformLabel = document.getElementById('platform-label-desc');
  platformLabel.textContent = platform ? `for ${platform.label}` : '';

  const imageWrap = document.getElementById('image-wrap');
  const imgEl = document.getElementById('listing-image');
  if (listing.image_url) {
    imgEl.src = listing.image_url;
    imageWrap.classList.remove('hidden');
  } else {
    imageWrap.classList.add('hidden');
  }

  const badge = document.getElementById('platform-badge');
  const platformName = document.getElementById('platform-name');
  if (platform) {
    badge.classList.add('detected');
    platformName.textContent = platform.label;
  } else {
    badge.classList.remove('detected');
    platformName.textContent = 'Not on a known platform';
  }

  const copyAllBtn = document.getElementById('btn-copy-all');
  const copyAllPlatformSpan = document.getElementById('copy-all-platform');
  copyAllPlatformSpan.textContent = platform ? platform.label : 'clipboard';

  // Store for copy handlers
  window._currentValues = {
    title: listing.title ?? '',
    price: listing.price != null ? `€${listing.price}` : '',
    condition: listing.condition ?? '',
    tags: (listing.tags ?? []).join(', '),
    description: desc,
    imageUrl: listing.image_url ?? null,
    platformLabel: platform?.label ?? '',
  };
}

function populateSelect(listings) {
  const sel = document.getElementById('listing-select');
  sel.innerHTML = '';
  listings.forEach((l, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const date = new Date(l.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    opt.textContent = l.title ? (l.title.length > 26 ? l.title.slice(0, 26) + '…' : l.title) : `Listing ${date}`;
    sel.appendChild(opt);
  });
}

// ── Copy helpers ──────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1800);
    }
  });
}

async function copyImage(url, btn) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext('2d').drawImage(bmp, 0, 0);
      pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy image`;
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    btn.textContent = 'Failed';
    setTimeout(() => {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy image`;
    }, 2000);
  }
}

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const { apiKey } = await chrome.storage.sync.get('apiKey');
  if (!apiKey) return showScreen('connect');

  showScreen('loading');

  const [platform, fetchedListings] = await Promise.all([
    detectPlatform(),
    fetchListings(apiKey).catch(err => ({ error: err.message })),
  ]);

  if (fetchedListings.error !== undefined) {
    document.getElementById('error-message').textContent = fetchedListings.error.includes('401')
      ? 'Invalid API key. Check your settings.'
      : 'Could not load listings. Check your connection.';
    return showScreen('error');
  }

  if (!fetchedListings.length) return showScreen('empty');

  currentPlatform = platform;
  listings = fetchedListings;
  currentListing = listings[0];

  populateSelect(listings);
  renderListing(currentListing, currentPlatform);
  showScreen('main');
}

// ── Event listeners ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  // Settings toggle
  document.getElementById('btn-settings').addEventListener('click', () => {
    const isVisible = !screens.settings.classList.contains('hidden');
    if (isVisible) {
      init();
    } else {
      chrome.storage.sync.get('apiKey', ({ apiKey }) => {
        if (apiKey) document.getElementById('input-api-key').value = apiKey;
      });
      showScreen('settings');
    }
  });

  document.getElementById('btn-open-settings').addEventListener('click', () => showScreen('settings'));

  // Save API key
  document.getElementById('btn-save-key').addEventListener('click', () => {
    const key = document.getElementById('input-api-key').value.trim();
    if (!key) return;
    chrome.storage.sync.set({ apiKey: key }, () => init());
  });

  // Remove API key
  document.getElementById('btn-remove-key').addEventListener('click', () => {
    chrome.storage.sync.remove('apiKey', () => showScreen('connect'));
  });

  // Retry
  document.getElementById('btn-retry').addEventListener('click', init);

  // Listing select
  document.getElementById('listing-select').addEventListener('change', e => {
    currentListing = listings[parseInt(e.target.value, 10)];
    renderListing(currentListing, currentPlatform);
  });

  // Copy individual fields
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const val = window._currentValues?.[target] ?? '';
      copyText(val, btn);
    });
  });

  // Copy image
  document.getElementById('btn-copy-image').addEventListener('click', function() {
    const url = window._currentValues?.imageUrl;
    if (url) copyImage(url, this);
  });

  // Copy all
  document.getElementById('btn-copy-all').addEventListener('click', function() {
    const v = window._currentValues;
    if (!v) return;
    const all = [
      v.title,
      v.price ? `Price: ${v.price}` : '',
      v.condition ? `Condition: ${v.condition}` : '',
      v.description,
      v.tags ? `Tags: ${v.tags}` : '',
    ].filter(Boolean).join('\n\n');
    copyText(all, this);
    this.textContent = 'Copied!';
    setTimeout(() => {
      this.textContent = `Copy all for ${v.platformLabel || 'clipboard'}`;
    }, 2000);
  });
});
