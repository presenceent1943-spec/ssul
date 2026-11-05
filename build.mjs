import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const r = await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  target: ['es2020'],
  legalComments: 'none',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/base.css', 'utf8') + '\n' + readFileSync('src/extra.css', 'utf8');
const version = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

// 1) 아티팩트용 (claude.ai가 문서 골격을 씌움)
const artifact = `<title>썰</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap" />
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', artifact);

// 2) 설치형 웹앱(PWA)용 — 단독 문서
const site = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>썰</title>
<meta name="description" content="듣다가, 마음에 들면 구독하는 이야기 앱">
<meta name="application-name" content="썰">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="썰">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff9f2">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1613">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="64x64" href="favicon.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<link rel="stylesheet" href="fonts/jua.css">
<style>
:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html{scroll-padding-top:env(safe-area-inset-top,0px);background:var(--bg)}
body{margin:0;padding:0}
img{max-width:100%}
[hidden]{display:none!important}
${css}
</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
<script>
if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }
</script>
</body>
</html>
`;
mkdirSync('site', { recursive: true });
writeFileSync('site/index.html', site);

const fontFiles = readdirSync('site/fonts/jua').map((f) => './fonts/jua/' + f);
const sw = `// 썰 서비스 워커 — 앱 껍데기와 글꼴만 캐시. 새 배포가 올라오면 다음 실행 때 자동 교체됩니다.
const VERSION = 'ssul-${version}';
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
`;
writeFileSync('site/sw.js', sw);

const manifest = {
  name: '썰',
  short_name: '썰',
  description: '듣다가, 마음에 들면 구독하는 이야기 앱',
  id: './',
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#fff9f2',
  theme_color: '#c74720',
  lang: 'ko',
  categories: ['entertainment', 'books', 'social'],
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
writeFileSync('site/manifest.webmanifest', JSON.stringify(manifest, null, 2));
console.log('built', version, (artifact.length / 1024).toFixed(0) + 'KB artifact,', (site.length / 1024).toFixed(0) + 'KB site');
