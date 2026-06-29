/* PerDiscuss service worker — offline PWA.
   App shell is versioned (bump APP_CACHE on each app update);
   PDFs live in a stable cache so they are NOT re-downloaded on app updates. */
const APP_CACHE = 'perdiscuss-app-v30';
const PDF_CACHE = 'perdiscuss-pdf-v1';
const APP_ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'pdf.min.js', 'pdf.worker.min.js', 'qrcode.js',
  'icon-192.png', 'icon-512.png'
];
const PDF_ASSETS = [
  '00_front-matter.pdf', 'ch0_general.pdf', 'ch1_laws-regulations.pdf', 'ch2_sop.pdf',
  'ch3_first-aid.pdf', 'ch4_emergency-procedures.pdf', 'ch5_emergency-equipment.pdf',
  'ch6_dangerous-goods.pdf', 'ch7_security.pdf',
  'appendix-a.pdf', 'appendix-b.pdf', 'appendix-c.pdf'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(Promise.all([
    caches.open(APP_CACHE).then(c => Promise.allSettled(APP_ASSETS.map(u => c.add(u)))),
    caches.open(PDF_CACHE).then(async c => {
      for (const u of PDF_ASSETS) {
        if (!(await c.match(u))) { try { await c.add(u); } catch (e) {} }
      }
    })
  ]));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== APP_CACHE && k !== PDF_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // CDN/Firebase pass straight to network
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          const target = /\.pdf$/i.test(url.pathname) ? PDF_CACHE : APP_CACHE;
          caches.open(target).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'))
    )
  );
});
