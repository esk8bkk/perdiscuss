/* PerDiscuss service worker — offline + precache CCM PDFs (build v25) */
const CACHE = 'perdiscuss-v25';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'pdf.min.js', 'pdf.worker.min.js', 'qrcode.js',
  'icon-192.png', 'icon-512.png',
  '00_front-matter.pdf', 'ch0_general.pdf', 'ch1_laws-regulations.pdf', 'ch2_sop.pdf',
  'ch3_first-aid.pdf', 'ch4_emergency-procedures.pdf', 'ch5_emergency-equipment.pdf',
  'ch6_dangerous-goods.pdf', 'ch7_security.pdf',
  'appendix-a.pdf', 'appendix-b.pdf', 'appendix-c.pdf'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(u => c.add(u))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // let CDN/Firebase pass through to network
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'))
    )
  );
});
