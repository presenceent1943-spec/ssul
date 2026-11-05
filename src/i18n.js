// 다국어: 한국어 원문을 키로 쓰고, 다른 언어는 사전에서 찾는다. 없으면 영어 → 한국어 순으로 대체.
import { DICTS } from './dicts.js';

export const LANGS = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' },
  { id: 'zh', label: '中文(简体)' },
  { id: 'es', label: 'Español' },
];

export const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', es: 'es-ES' };

export function detectLang() {
  try {
    const nav = (navigator.language || 'ko').toLowerCase();
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
  } catch {}
  return 'ko';
}

function fill(s, params) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
}

export function makeT(lang) {
  const dict = DICTS[lang];
  const en = DICTS.en;
  return (key, params) => {
    let s = key;
    if (lang !== 'ko') s = dict?.[key] ?? en?.[key] ?? key;
    return fill(s, params);
  };
}

export function fmtCount(n, lang) {
  if (lang === 'ko') {
    if (n >= 1e4) return `${(n / 1e4).toFixed(1).replace(/\.0$/, '')}만`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}천`;
    return String(n);
  }
  if (lang === 'ja' || lang === 'zh') {
    if (n >= 1e4) return `${(n / 1e4).toFixed(1).replace(/\.0$/, '')}万`;
    return n.toLocaleString(LOCALE[lang]);
  }
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function fmtDur(sec, t) {
  const s0 = Math.max(0, Math.round(sec));
  const m = Math.floor(s0 / 60);
  const s = s0 % 60;
  if (m === 0) return t('{n}초', { n: s });
  if (s === 0) return t('{n}분', { n: m });
  return t('{m}분 {s}초', { m, s });
}

export function relTime(iso, t, lang, now = new Date()) {
  const d = (now.getTime() - new Date(iso).getTime()) / 1e3;
  if (d < 60) return t('방금');
  if (d < 3600) return t('{n}분 전', { n: Math.floor(d / 60) });
  if (d < 86400) return t('{n}시간 전', { n: Math.floor(d / 3600) });
  if (d < 2592e3) return t('{n}일 전', { n: Math.floor(d / 86400) });
  return new Intl.DateTimeFormat(LOCALE[lang] ?? 'ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).format(new Date(iso));
}

export function periodLabel(period, lang, now = new Date()) {
  const f = new Intl.DateTimeFormat(LOCALE[lang] ?? 'ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });
  const days = period === 'week' ? 7 : 30;
  const from = new Date(now.getTime() - (days - 1) * 864e5);
  return `${f.format(from)} ~ ${f.format(now)} (KST)`;
}

export function fmtKRW(n, t) {
  return t('{n}원', { n: (n ?? 0).toLocaleString() });
}
