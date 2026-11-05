import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CAT } from './data.js';
import { COVER_PRESETS, displayName, useStore, useT } from './store.jsx';
import { useApp } from './app-ctx.js';
import { previewSentenceCount, totalSec } from './util.js';
import { fmtDur, fmtKRW } from './i18n.js';

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm3.5-12.5-2 5-5 2 2-5z',
  plus: 'M12 5v14M5 12h14',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  play: 'M7 4v16l13-8z',
  pause: 'M7 4h4v16H7zM13 4h4v16h-4z',
  back10: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5M9.5 15v-6l-1.5 1M13.5 9.5h1.8a1.2 1.2 0 0 1 0 2.4h-1.8v3.1h3',
  fwd10: 'M20 12a8 8 0 1 1-3-6.2M20 4v5h-5M9.5 15v-6l-1.5 1M13.5 9.5h1.8a1.2 1.2 0 0 1 0 2.4h-1.8v3.1h3',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v7h14v-7',
  flag: 'M5 21V4h11l-1.5 3.5L16 11H5',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.5-4.5',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  speaker: 'M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11',
  'speaker-off': 'M4 10v4h4l5 4V6l-5 4zM16 9l5 6M21 9l-5 6',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6 6 18',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  mic: 'M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm-6-4a6 6 0 0 0 12 0M12 17v4M9 21h6',
  text: 'M4 6h16M4 12h10M4 18h16',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  layers: 'M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  'eye-off': 'M3 3l18 18M10 6.5A10 10 0 0 1 21 12a10 10 0 0 1-2.5 3.5M6.5 7.5A10 10 0 0 0 3 12a10 10 0 0 0 12 6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2',
  comment: 'M4 5h16v11H9l-5 4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  palette: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1a9 9 0 0 0-6-12zM8 9h.01M12 7h.01M16 9h.01M7 13h.01',
  image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4M15 9h.01',
  voice: 'M4 12h2M8 8v8M12 5v14M16 8v8M20 12h2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
};

export function Icon({ name, size = 20, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} />
    </svg>
  );
}

// 로고: 말풍선 안의 '썰'
export function Logo({ size = 36, wordmark = false, className = '' }) {
  return (
    <span className={`logo ${className}`} style={{ '--logo-size': `${size}px` }} aria-label="썰" role="img">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 7h36c6 0 10 4 10 10v24c0 6-4 10-10 10H30L16 61v-10h-2C8 51 4 47 4 41V17C4 11 8 7 14 7z" fill="var(--accent)" />
        <path d="M14 7h36c6 0 10 4 10 10v24c0 6-4 10-10 10H30L16 61v-10h-2C8 51 4 47 4 41V17C4 11 8 7 14 7z" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1.5" />
        <text x="32" y="30" textAnchor="middle" dominantBaseline="central" fontFamily="'Jua', 'Black Han Sans', sans-serif" fontSize="30" fill="var(--accent-fg)">
          썰
        </text>
      </svg>
      {wordmark && <span className="logo-word">썰</span>}
    </span>
  );
}

export function Button({ variant = 'secondary', size = 'md', icon, block, className = '', children, ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, className = '' }) {
  return (
    <button type="button" className={`chip ${active ? 'chip-on' : ''} ${className}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label className="toggle-row" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden="true" />
    </label>
  );
}

export function SectionHead({ title, action, sub }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        {sub && <p className="section-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, desc, action }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {desc && <p className="empty-desc">{desc}</p>}
      {action}
    </div>
  );
}

export function Avatar({ name, hue, size = 40, anon }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `oklch(0.86 0.07 ${hue})`, color: `oklch(0.35 0.09 ${hue})` }} aria-hidden="true">
      {anon ? '·' : (name ?? '').slice(0, 1)}
    </span>
  );
}

// 배경 스타일: 프리셋 그라데이션 / 색상 / 사진
export function coverStyle(cover, hue, dark) {
  if (cover?.kind === 'image' && cover.dataUrl) return { backgroundImage: `url(${cover.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (cover?.kind === 'preset') {
    const p = COVER_PRESETS.find((x) => x.id === cover.id);
    if (p) return { background: p.css };
  }
  if (cover?.kind === 'hue') return { background: `linear-gradient(145deg, oklch(0.9 0.07 ${cover.hue}), oklch(0.68 0.14 ${cover.hue}))` };
  if (dark) return { background: `linear-gradient(145deg, var(--cover-dark), oklch(0.32 0.08 ${hue}))` };
  return { background: `linear-gradient(145deg, oklch(0.9 0.07 ${hue}), oklch(0.7 0.13 ${hue}))` };
}

function coverFg(cover, dark) {
  if (cover?.kind === 'image' || cover?.kind === 'preset' || dark) return '#fff';
  return 'oklch(0.28 0.08 0 / .92)';
}

// 대표 이미지: 큰 글씨로 카테고리를 써 넣는다 (연애·공포·일상·감동…)
export function Cover({ category, hue, cover, size = 56, label, radius, className = '', word }) {
  const t = useT();
  const cat = CAT[category];
  const h = hue ?? cat?.hue ?? 30;
  const dark = category === 'horror' && !cover;
  const fg = coverFg(cover, dark);
  const text = word ?? t(cat?.short ?? '썰');
  const fs = size * (text.length <= 2 ? 0.36 : text.length <= 4 ? 0.26 : 0.2);
  return (
    <span className={`cover ${cover?.kind === 'image' ? 'cover-img' : ''} ${className}`} style={{ width: size, height: size, borderRadius: radius, ...coverStyle(cover, h, dark) }} aria-hidden="true">
      <span className="cover-word" style={{ fontSize: fs, color: fg }}>
        {text}
      </span>
      {label && <span className="cover-label">{label}</span>}
    </span>
  );
}

// 정사각 타일(그리드용): 꽉 채우는 커버 + 제목
export function CoverFill({ work, children }) {
  const t = useT();
  const cat = CAT[work.category];
  const dark = work.category === 'horror' && !work.cover;
  const fg = coverFg(work.cover, dark);
  const text = t(cat.short);
  return (
    <span className={`cover-fill ${work.cover?.kind === 'image' ? 'cover-img' : ''}`} style={coverStyle(work.cover, work.hue ?? cat.hue, dark)}>
      <span className="cover-fill-word" style={{ color: fg }}>
        {text}
      </span>
      {children}
    </span>
  );
}

export function Sheet({ open, onClose, title, children, tall }) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className={`sheet ${tall ? 'sheet-tall' : ''}`} role="dialog" aria-modal="true" aria-label={title ?? t('창')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        {title && (
          <div className="sheet-head">
            <h3>{title}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('닫기')}>
              <Icon name="x" />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, show] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const h = window.setTimeout(() => show(null), 2400);
    return () => window.clearTimeout(h);
  }, [msg]);
  return { msg, show };
}

export function Toast({ msg }) {
  return (
    <div className={`toast ${msg ? 'toast-on' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}

export const ORIGIN_LABEL = { true: '실화', adapted: '각색', fiction: '창작' };

export function Meta({ work, compact }) {
  const { state } = useStore();
  const t = useT();
  const sec = totalSec(work.sentences, state.ops.charsPerSec);
  return (
    <span className="meta-row">
      <span>{fmtDur(sec, t)}</span>
      <span aria-hidden="true">·</span>
      <span>{t(CAT[work.category].name)}</span>
      {work.paid ? <Badge tone="warm">{t('유료 {price}', { price: fmtKRW(work.priceKRW, t) })}</Badge> : <Badge tone="good">{t('무료')}</Badge>}
      {!compact && (
        <>
          <span aria-hidden="true">·</span>
          <span title={t('작성자의 표시이며 플랫폼이 사실을 검증했다는 뜻이 아닙니다')}>{t(ORIGIN_LABEL[work.origin])}</span>
          <span aria-hidden="true">·</span>
          <span>{work.voice === 'ai' ? t('AI 음성') : t('본인 목소리')}</span>
        </>
      )}
    </span>
  );
}

// 더보기: 두 줄만 보여 주고 누르면 펼친다
export function MoreText({ text, lines = 2, className = '' }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, open, lines]);
  if (!text) return null;
  return (
    <span className={`more-text ${className}`}>
      <span ref={ref} className={`more-body ${open ? '' : 'more-clamp'}`} style={{ '--lines': lines }}>
        {text}
      </span>
      {(clamped || open) && (
        <button type="button" className="more-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? t('접기') : t('더보기')}
        </button>
      )}
    </span>
  );
}

export function snippetOf(work, ops) {
  const n = Math.max(1, previewSentenceCount(work.sentences, ops.previewMaxSec, ops.charsPerSec));
  const body = work.sentences.slice(0, n).join(' ');
  const more = work.sentences.length > n ? ' …' : '';
  return (work.intro ? work.intro + '\n' : '') + body + more;
}

export function WorkCard({ work, queue, showCreator = true, index }) {
  const { push, playWork, player } = useApp();
  const { state, creators } = useStore();
  const t = useT();
  const creator = creators[work.creatorId];
  const cur = player.ui.workId === work.id;
  const playing = cur && player.ui.playing;
  const pos = state.positions[work.id] ?? 0;
  const total = totalSec(work.sentences, state.ops.charsPerSec);
  const prog = pos > 0 && pos < total - 1 ? pos / total : 0;
  const open = () => push({ kind: 'work', id: work.id });
  return (
    <article className={`work-card ${cur ? 'work-card-current' : ''}`}>
      {index != null && (
        <span className="rank-no" aria-label={t('{n}위', { n: index })}>
          {index}
        </span>
      )}
      <button type="button" className="work-card-cover" onClick={open} aria-label={t('{title} 상세', { title: work.title })}>
        <Cover category={work.category} hue={work.hue} cover={work.cover} size={72} label={work.episodeNo ? t('{n}화', { n: work.episodeNo }) : undefined} />
      </button>
      <div className="work-card-text">
        <button type="button" className="work-title" onClick={open}>
          {work.title}
        </button>
        {showCreator && creator && (
          <button type="button" className="work-author" onClick={() => push({ kind: 'creator', id: work.creatorId })} aria-label={t('{name} 프로필', { name: displayName(creator, t) })}>
            <Avatar name={creator.name} hue={creator.hue} size={20} anon={creator.id === 'me' && creator.nameMode === 'anon'} />
            {displayName(creator, t)}
          </button>
        )}
        <Meta work={work} compact />
        <MoreText text={snippetOf(work, state.ops)} lines={2} className="work-snippet" />
        {work.tags.length > 0 && (
          <span className="work-tags">
            {work.tags.slice(0, 3).map((tg) => (
              <button key={tg} type="button" className="tag-link" onClick={() => push({ kind: 'tag', tag: tg })}>
                #{tg}
              </button>
            ))}
          </span>
        )}
        {prog > 0 && (
          <span className="progress-mini" role="progressbar" aria-valuenow={Math.round(prog * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t('들은 위치')}>
            <span style={{ width: `${prog * 100}%` }} />
          </span>
        )}
      </div>
      <div className="work-card-side">
        <button type="button" className={`play-pill ${playing ? 'play-pill-on' : ''}`} onClick={() => (cur ? player.toggle() : playWork(work.id, queue))} aria-label={playing ? t('{title} 일시정지', { title: work.title }) : t('{title} 재생', { title: work.title })}>
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <span className="play-pill-label" aria-hidden="true">
          {playing ? t('정지') : prog > 0 ? t('이어서') : t('재생')}
        </span>
      </div>
    </article>
  );
}

export function WorkList({ works, queue, emptyText, showCreator = true, ranked }) {
  const t = useT();
  if (works.length === 0) return <p className="muted small">{emptyText ?? t('아직 작품이 없어요.')}</p>;
  const ids = works.map((w) => w.id);
  return (
    <div className="work-list">
      {works.map((w, i) => (
        <WorkCard key={w.id} work={w} queue={queue ? ids.slice(i + 1) : undefined} showCreator={showCreator} index={ranked ? i + 1 : undefined} />
      ))}
    </div>
  );
}

// 인스타그램 돋보기식 격자
// 인스타그램 탐색탭 모자이크: 3열, 여백 없음, 5개 묶음마다 세로로 긴 타일이 왼쪽·오른쪽을 번갈아 차지
function mosaicPos(i) {
  const g = Math.floor(i / 5);
  const k = i % 5;
  const base = 2 * g + 1;
  const tallLeft = g % 2 === 0;
  if (k === 0) return { tall: true, row: `${base} / span 2`, col: tallLeft ? '1' : '3' };
  const cols = tallLeft ? [2, 3] : [1, 2];
  const r = k <= 2 ? base : base + 1;
  const c = cols[(k - 1) % 2];
  return { tall: false, row: `${r}`, col: `${c}` };
}

export function WorkGrid({ works, queue, emptyText, mosaic = false, bleed = false }) {
  const { push } = useApp();
  const t = useT();
  if (works.length === 0) return <p className="muted small">{emptyText ?? t('아직 작품이 없어요.')}</p>;
  const full = Math.floor(works.length / 5) * 5; // 마지막 묶음이 5개 미만이면 정사각형만
  return (
    <div className={`explore-grid ${mosaic ? 'explore-mosaic' : ''} ${bleed ? 'explore-bleed' : ''}`}>
      {works.map((w, i) => {
        const pos = mosaic && i < full ? mosaicPos(i) : null;
        const style = pos ? { gridRow: pos.row, gridColumn: pos.col } : undefined;
        return (
          <button key={w.id} type="button" className={`tile-hit ${pos?.tall ? 'tile-tall' : ''}`} style={style} onClick={() => push({ kind: 'work', id: w.id })} aria-label={t('{title} 상세', { title: w.title })}>
            <CoverFill work={w}>
              <span className="tile-mark" aria-hidden="true">
                {w.paid ? <Icon name="lock" size={14} /> : w.seriesId ? <Icon name="layers" size={14} /> : null}
              </span>
              <span className="tile-name">{w.title}</span>
            </CoverFill>
          </button>
        );
      })}
    </div>
  );
}

export function ViewToggle({ view, onChange }) {
  const t = useT();
  return (
    <div className="seg seg-small view-toggle" role="group" aria-label={t('보기 방식')}>
      <button type="button" className={view === 'list' ? 'seg-on' : ''} onClick={() => onChange('list')} aria-pressed={view === 'list'} aria-label={t('목록')}>
        <Icon name="list" size={16} />
      </button>
      <button type="button" className={view === 'grid' ? 'seg-on' : ''} onClick={() => onChange('grid')} aria-pressed={view === 'grid'} aria-label={t('격자')}>
        <Icon name="grid" size={16} />
      </button>
    </div>
  );
}

export function BackBar({ title, right }) {
  const { back } = useApp();
  const t = useT();
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={back} aria-label={t('뒤로')}>
        <Icon name="chevron-left" />
      </button>
      <h1 className="page-title page-title-center">{title}</h1>
      <span className="topbar-right">{right}</span>
    </header>
  );
}

export function SubscribeButton({ creatorId, size = 'md' }) {
  const { state, dispatch } = useStore();
  const { requireLogin } = useApp();
  const t = useT();
  if (creatorId === 'me') return null;
  const on = state.subscriptions.includes(creatorId);
  return (
    <Button size={size} variant={on ? 'secondary' : 'primary'} icon={on ? 'check' : undefined} onClick={() => requireLogin(() => dispatch({ type: 'toggleSubscribe', creatorId }))} aria-pressed={on}>
      {on ? t('구독 중') : t('무료 구독')}
    </Button>
  );
}

export function Row({ label, sub, onClick, icon }) {
  return (
    <button type="button" className="row" onClick={onClick}>
      {icon && <Icon name={icon} size={20} />}
      <span className="row-text">
        <span className="row-title">{label}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      <Icon name="chevron-right" />
    </button>
  );
}
