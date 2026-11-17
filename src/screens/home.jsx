import { useMemo, useState } from 'react';
import { BUNDLES, CATEGORIES } from '../data.js';
import { useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Button, Chip, Cover, Empty, Icon, Logo, SectionHead, ViewToggle, WorkGrid, WorkList } from '../ui.jsx';
import { totalSec } from '../util.js';
import { fmtDur } from '../i18n.js';

export function ThemeQuickToggle() {
  const { state, dispatch } = useStore();
  const t = useT();
  const dark = state.prefs.theme === 'dark' || (state.prefs.theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  return (
    <button type="button" className="icon-btn icon-btn-labeled" onClick={() => dispatch({ type: 'setPrefs', prefs: { theme: dark ? 'light' : 'dark' } })} aria-label={dark ? t('밝은 화면으로') : t('어두운 화면으로')}>
      <Icon name={dark ? 'sun' : 'moon'} />
      <span>{dark ? t('밝게') : t('어둡게')}</span>
    </button>
  );
}

// 30초 썰: 1분 안에 끝나는 이야기를 세로 타일로 한 줄에 — 누르면 숏츠 화면에서 그 작품부터
function ShortsStrip({ works, cps }) {
  const { push } = useApp();
  const t = useT();
  if (!works.length) return null;
  return (
    <section aria-label={t('30초 썰')}>
      <SectionHead
        title={t('30초 썰')}
        sub={t('1분 안에 끝나는 이야기 · 위로 넘기며 들어요')}
        action={
          <Button size="sm" variant="ghost" icon="chevron-right" className="btn-more btn-more-arrow" onClick={() => push({ kind: 'shorts' })}>
            {t('전체 보기')}
          </Button>
        }
      />
      <div className="shorts-strip">
        {works.map((w) => (
          <button key={w.id} type="button" className="shorts-tile" onClick={() => push({ kind: 'shorts', startId: w.id })} aria-label={t('{title} 듣기', { title: w.title })}>
            <Cover category={w.category} hue={w.hue} cover={w.cover} size={108} h={144} radius={14} label={fmtDur(totalSec(w.sentences, cps), t)} />
            <span className="shorts-tile-title">{w.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Home() {
  const { state, works, creators, dispatch } = useStore();
  const { push, setTab, playWork } = useApp();
  const t = useT();
  const [feed, setFeed] = useState('reco');
  const [cat, setCat] = useState('all');
  const cps = state.ops.charsPerSec;
  const view = state.prefs.homeView;
  const visible = useMemo(() => works.filter((w) => !state.notInterested.includes(w.id)), [works, state.notInterested]);
  const reco = useMemo(
    () =>
      visible
        .filter((w) => cat === 'all' || w.category === cat)
        .map((w) => {
          let s = Math.log1p(w.stats.week.validListens);
          if (state.interests.includes(w.category)) s += 2;
          if (creators[w.creatorId]?.isNew) s += 1.5;
          if (state.lessFrom.includes(w.creatorId)) s -= 3;
          if (state.completed.includes(w.id)) s -= 1;
          s += ((w.id.charCodeAt(2) % 7) * 0.1);
          return { w, s };
        })
        .sort((a, b) => b.s - a.s)
        .map((x) => x.w),
    [visible, cat, state.interests, state.lessFrom, state.completed, creators]
  );
  const subs = useMemo(() => visible.filter((w) => state.subscriptions.includes(w.creatorId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [visible, state.subscriptions]);
  const cont = useMemo(
    () =>
      visible.filter((w) => {
        const p = state.positions[w.id] ?? 0;
        return p > 3 && p < totalSec(w.sentences, cps) - 2;
      }),
    [visible, state.positions, cps]
  );
  const shorts = useMemo(() => visible.filter((w) => totalSec(w.sentences, cps) <= state.ops.shortMaxSec).sort((a, b) => b.stats.week.validListens - a.stats.week.validListens), [visible, cps, state.ops.shortMaxSec]);
  const List = view === 'grid' ? WorkGrid : WorkList;

  return (
    <div className="screen">
      <header className="topbar">
        <div className="brand">
          <Logo size={34} wordmark />
        </div>
        <div className="topbar-actions">
          <ThemeQuickToggle />
          <button type="button" className="icon-btn icon-btn-labeled" onClick={() => setTab('discover')}>
            <Icon name="search" />
            <span>{t('검색')}</span>
          </button>
          <button type="button" className="icon-btn icon-btn-labeled" onClick={() => push({ kind: 'notifications' })}>
            <Icon name="bell" />
            <span>{t('알림')}</span>
            {state.notices.some((n) => !n.read) && <span className="dot" aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="row-between">
        <div className="seg" role="tablist" aria-label={t('피드 선택')}>
          <button type="button" role="tab" aria-selected={feed === 'reco'} className={feed === 'reco' ? 'seg-on' : ''} onClick={() => setFeed('reco')}>
            {t('추천')}
          </button>
          <button type="button" role="tab" aria-selected={feed === 'subs'} className={feed === 'subs' ? 'seg-on' : ''} onClick={() => setFeed('subs')}>
            {t('구독 중')}
            {state.subscriptions.length > 0 && <span className="count">{state.subscriptions.length}</span>}
          </button>
        </div>
        <ViewToggle view={view} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { homeView: v } })} />
      </div>

      {feed === 'reco' ? (
        <>
          <div className="chip-row" role="group" aria-label={t('카테고리')}>
            <Chip active={cat === 'all'} onClick={() => setCat('all')}>
              {t('전체')}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                {t(c.name)}
              </Chip>
            ))}
          </div>
          {cat === 'all' && <ShortsStrip works={shorts} cps={cps} />}
          {cont.length > 0 && cat === 'all' && (
            <>
              <SectionHead title={t('이어 듣기')} sub={t('듣던 위치부터 다시 들을 수 있어요')} />
              <WorkList works={cont.slice(0, 3)} />
            </>
          )}
          {cat === 'all' && (
            <section aria-label={t('상황별 추천')}>
              <SectionHead title={t('지금 상황에 맞게')} sub={t('태그와 길이로 묶은 추천이에요')} />
              <div className="bundles">
                {BUNDLES.map((b) => {
                  const list = visible.filter((w) => b.filter(w, totalSec(w.sentences, cps))).slice(0, 6);
                  if (!list.length) return null;
                  return (
                    <button key={b.id} type="button" className="bundle" onClick={() => playWork(list[0].id, list.slice(1).map((w) => w.id))} aria-label={t('{title} 묶음 듣기', { title: t(b.title) })}>
                      <span className="bundle-title">{t(b.title)}</span>
                      <span className="bundle-desc">
                        {t(b.desc)} · {t('{n}편', { n: list.length })}
                      </span>
                      <span className="bundle-play">
                        <Icon name="play" size={14} /> {t('묶음 듣기')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          <SectionHead
            title={cat === 'all' ? t('지금 들을 만한 이야기') : t(CATEGORIES.find((c) => c.id === cat)?.name ?? '')}
            sub={state.interests.length ? t('관심 장르와 새 창작자를 섞어 보여 드려요') : t('관심 장르를 고르면 더 정확해져요')}
            action={
              <Button size="sm" variant="ghost" icon="star" className="btn-more" onClick={() => push({ kind: 'ranking' })}>
                {t('인기순위')}
              </Button>
            }
          />
          <List works={reco} queue />
        </>
      ) : state.subscriptions.length === 0 ? (
        <Empty
          title={t('아직 구독한 창작자가 없어요')}
          desc={t('마음에 드는 이야기를 듣다가 작가를 구독하면, 새 작품이 여기에 모여요.')}
          action={
            <Button variant="primary" onClick={() => setFeed('reco')}>
              {t('추천 보러 가기')}
            </Button>
          }
        />
      ) : (
        <>
          {cont.length > 0 && (
            <>
              <SectionHead title={t('이어 듣기')} />
              <WorkList works={cont} />
            </>
          )}
          <SectionHead title={t('구독한 창작자의 새 작품')} sub={t('최근 게시 순')} />
          <List works={subs} queue emptyText={t('구독한 창작자의 작품이 아직 없어요.')} />
        </>
      )}
    </div>
  );
}
