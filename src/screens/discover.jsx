import { useMemo, useState } from 'react';
import { CAT, CATEGORIES, CREATORS } from '../data.js';
import { subscriberCount, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, BackBar, Button, Chip, Empty, Icon, SectionHead, WorkGrid, WorkList } from '../ui.jsx';
import { rankWorks, searchAll, topTags, totalSec, worksByTag } from '../util.js';
import { fmtCount, periodLabel } from '../i18n.js';
import { RANK_W, expectedCompletion } from '../util.js';

export function SearchBox({ initial = '' }) {
  const { push } = useApp();
  const t = useT();
  const [q, setQ] = useState(initial);
  return (
    <form
      className="search-box"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) push({ kind: 'search', q: q.trim() });
      }}
    >
      <Icon name="search" size={18} />
      <input id="search-input" type="search" placeholder={t('작품, 창작자, #해시태그')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('검색어')} enterKeyHint="search" />
      <button type="submit" className="btn btn-primary btn-sm">
        {t('검색')}
      </button>
    </form>
  );
}

// 발견: 인스타그램 탐색탭 — 검색창 아래 바로 여백 없는 모자이크
export function Discover() {
  const { works, state, lang } = useStore();
  const { push } = useApp();
  const t = useT();
  const [cat, setCat] = useState('all');
  const cps = state.ops.charsPerSec;
  const shorts = useMemo(() => works.filter((w) => totalSec(w.sentences, cps) <= state.ops.shortMaxSec), [works, cps, state.ops.shortMaxSec]);
  const newCreators = CREATORS.filter((c) => c.isNew || subscriberCount(c, state) < 200);
  const grid = useMemo(() => {
    const list = works.filter((w) => !state.notInterested.includes(w.id) && (cat === 'all' || w.category === cat));
    // 인기와 최신을 섞어 모자이크가 단조롭지 않게
    return list
      .map((w, i) => ({ w, s: Math.log1p(w.stats.week.validListens) + ((w.id.charCodeAt(3) + i) % 5) * 0.3 }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.w);
  }, [works, state.notInterested, cat]);

  return (
    <div className="screen screen-explore">
      <SearchBox />
      <div className="chip-row explore-chips" role="group" aria-label={t('카테고리')}>
        <Chip className="chip-accent" onClick={() => push({ kind: 'ranking' })}>
          <Icon name="star" size={14} /> {t('인기순위')}
        </Chip>
        <Chip className="chip-accent" onClick={() => push({ kind: 'shorts' })}>
          <Icon name="clock" size={14} /> {t('30초 썰')} <span className="count">{shorts.length}</span>
        </Chip>
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          {t('전체')}
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {t(c.short)}
          </Chip>
        ))}
      </div>
      <WorkGrid works={grid} queue mosaic bleed />
      <SectionHead title={t('인기 해시태그')} sub={t('누르면 관련 작품으로')} />
      <div className="chip-row chip-wrap">
        {topTags(works).map(([tag, n]) => (
          <Chip key={tag} onClick={() => push({ kind: 'tag', tag })}>
            #{tag} <span className="count">{n}</span>
          </Chip>
        ))}
      </div>
      <SectionHead title={t('새 창작자 발견')} sub={t('구독자 200명 미만 · 최근 가입')} />
      <div className="creator-row">
        {newCreators.map((c) => (
          <button key={c.id} type="button" className="creator-tile" onClick={() => push({ kind: 'creator', id: c.id })}>
            <Avatar name={c.name} hue={c.hue} size={48} />
            <span className="creator-name">{c.name}</span>
            <span className="creator-sub">{t('구독자 {n}', { n: fmtCount(subscriberCount(c, state), lang) })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchResult({ q }) {
  const { works, creators, state, lang } = useStore();
  const { push } = useApp();
  const t = useT();
  const r = useMemo(() => searchAll(q, works, Object.values(creators).filter((c) => c.id !== 'me')), [q, works, creators]);
  const none = r.works.length + r.creators.length + r.tags.length === 0;
  return (
    <div className="screen">
      <BackBar title={t('"{q}" 검색', { q })} />
      <SearchBox initial={q} />
      {none && <Empty title={t('검색 결과가 없어요')} desc={t('다른 말로 찾아보거나 #해시태그로 검색해 보세요.')} />}
      {r.tags.length > 0 && (
        <>
          <SectionHead title={t('해시태그')} />
          <div className="chip-row chip-wrap">
            {r.tags.map((x) => (
              <Chip key={x.tag} onClick={() => push({ kind: 'tag', tag: x.tag })}>
                #{x.tag} <span className="count">{x.count}</span>
              </Chip>
            ))}
          </div>
        </>
      )}
      {r.creators.length > 0 && (
        <>
          <SectionHead title={t('창작자')} />
          <div className="list">
            {r.creators.map((c) => (
              <button key={c.id} type="button" className="row" onClick={() => push({ kind: 'creator', id: c.id })}>
                <Avatar name={c.name} hue={c.hue} />
                <span className="row-text">
                  <span className="row-title">{c.name}</span>
                  <span className="row-sub">
                    @{c.handle} · {t('구독자 {n}', { n: fmtCount(subscriberCount(c, state), lang) })}
                  </span>
                </span>
                <Icon name="chevron-right" />
              </button>
            ))}
          </div>
        </>
      )}
      {r.works.length > 0 && (
        <>
          <SectionHead title={t('작품 {n}편', { n: r.works.length })} />
          <WorkGrid works={r.works} queue mosaic bleed />
        </>
      )}
    </div>
  );
}

export function TagPage({ tag }) {
  const { works } = useStore();
  const t = useT();
  const list = useMemo(() => worksByTag(tag, works), [tag, works]);
  return (
    <div className="screen">
      <BackBar title={`#${tag}`} />
      <p className="muted small">{t('{n}편', { n: list.length })}</p>
      <WorkGrid works={list} queue mosaic bleed emptyText={t('이 태그의 작품이 아직 없어요.')} />
    </div>
  );
}

export function CategoryPage({ id }) {
  const { works } = useStore();
  const t = useT();
  const c = CAT[id];
  const list = useMemo(() => works.filter((w) => w.category === id).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [works, id]);
  return (
    <div className="screen">
      <BackBar title={t(c.name)} />
      <p className="muted small">{t(c.desc)}</p>
      <WorkGrid works={list} queue mosaic bleed />
    </div>
  );
}

export function Ranking() {
  const { works, state, lang } = useStore();
  const { push } = useApp();
  const t = useT();
  const [period, setPeriod] = useState('week');
  const [cat, setCat] = useState('all');
  const ranked = useMemo(
    () => rankWorks(works.filter((w) => cat === 'all' || w.category === cat), period, state.ops.charsPerSec, { ...RANK_W, shrinkM: state.ops.rankingShrinkM }),
    [works, period, cat, state.ops.charsPerSec, state.ops.rankingShrinkM]
  );
  return (
    <div className="screen">
      <BackBar title={t('인기순위')} />
      <div className="seg" role="tablist" aria-label={t('기간')}>
        <button type="button" role="tab" aria-selected={period === 'week'} className={period === 'week' ? 'seg-on' : ''} onClick={() => setPeriod('week')}>
          {t('주간')}
        </button>
        <button type="button" role="tab" aria-selected={period === 'month'} className={period === 'month' ? 'seg-on' : ''} onClick={() => setPeriod('month')}>
          {t('월간')}
        </button>
      </div>
      <p className="muted small">
        {t('집계 기간 {range}', { range: periodLabel(period, lang) })} · {t('유효 청취, 길이 보정 완청률, 저장·공유·반응을 함께 반영 (초기 제안 공식, 데모 수치)')}
      </p>
      <div className="chip-row">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          {t('전체')}
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {t(c.name)}
          </Chip>
        ))}
      </div>
      <WorkList works={ranked.slice(0, 20).map((r) => r.work)} queue ranked />
      <div className="card card-soft">
        <p className="small">
          <strong>{t('순위에 반영하지 않는 것')}</strong> · {t('조회수 단독 · 결제액 단독 · 자기 반복 재생 · 봇 행동 · 미리듣기 청취(전체 청취와 구분 집계)')}
        </p>
        <Button size="sm" variant="ghost" onClick={() => push({ kind: 'admin' })}>
          {t('가중치·보정값 보기(운영 설정)')}
        </Button>
      </div>
    </div>
  );
}

export { expectedCompletion };
