// 썰 서비스 워커 — 앱 껍데기와 글꼴만 캐시. 새 배포가 올라오면 다음 실행 때 자동 교체됩니다.
const VERSION = 'ssul-202611050851';
const SHELL = ['./', './index.html', './manifest.webmanifest', './fonts/jua.css', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const isFont = u.hostname === 'fonts.gstatic.com' || u.hostname === 'fonts.googleapis.com' || u.pathname.includes('/fonts/');
  if (isFont) {
    // 글꼴: 캐시 우선
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;
  // 앱 본체: 네트워크 우선, 끊기면 캐시
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))));
});
