import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CREATORS } from './data.js';
import { subscriberCount, useStore, useT } from './store.jsx';
import { AppCtx, useApp } from './app-ctx.js';
import { usePlayer } from './player.js';
import { Avatar, Button, Chip, Cover, Icon, Logo, Toast, useToast } from './ui.jsx';
import { rankWorks, topTags, workLink } from './util.js';
import { fmtCount, fmtKRW } from './i18n.js';
import { Home } from './screens/home.jsx';
import { CategoryPage, Discover, Ranking, SearchResult, TagPage } from './screens/discover.jsx';
import { SeriesPage, WorkDetail } from './screens/work.jsx';
import { CreatorPage, CustomizePage } from './screens/creator.jsx';
import { Create } from './screens/create.jsx';
import { Library } from './screens/library.jsx';
import { MyPage, Settings } from './screens/me.jsx';
import { LoginSheet, Notifications, Onboarding, PaidApply, PurchaseSheet, Purchases, ReportSheet, Stats } from './screens/misc.jsx';
import { Admin } from './screens/admin.jsx';
import { FullPlayer, MiniPlayer } from './screens/player-ui.jsx';
import { Shorts } from './screens/shorts.jsx';
import { InstallBanner } from './install.jsx';

const TABS = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'discover', label: '발견', icon: 'compass' },
  { id: 'create', label: '만들기', icon: 'plus' },
  { id: 'library', label: '보관함', icon: 'bookmark' },
  { id: 'me', label: '내 정보', icon: 'user' },
];

function Page({ tab, page, draftId, createKey, onCreateDone, onOpenDraft }) {
  if (page)
    switch (page.kind) {
      case 'work':
        return <WorkDetail id={page.id} />;
      case 'creator':
        return <CreatorPage id={page.id} />;
      case 'customize':
        return <CustomizePage />;
      case 'series':
        return <SeriesPage id={page.id} />;
      case 'tag':
        return <TagPage tag={page.tag} />;
      case 'category':
        return <CategoryPage id={page.id} />;
      case 'ranking':
        return <Ranking />;
      case 'search':
        return <SearchResult q={page.q} />;
      case 'admin':
        return <Admin />;
      case 'settings':
        return <Settings section={page.section} />;
      case 'stats':
        return <Stats />;
      case 'paid-apply':
        return <PaidApply />;
      case 'notifications':
        return <Notifications />;
      case 'purchases':
        return <Purchases />;
      default:
        return null;
    }
  switch (tab) {
    case 'home':
      return <Home />;
    case 'discover':
      return <Discover />;
    case 'create':
      return <Create key={createKey} draftId={draftId} onDone={onCreateDone} />;
    case 'library':
      return <Library onOpenDraft={onOpenDraft} />;
    case 'me':
      return <MyPage />;
    default:
      return null;
  }
}

function Rail() {
  const { works, state, lang } = useStore();
  const { push, playWork } = useApp();
  const t = useT();
  const tags = useMemo(() => topTags(works, 10), [works]);
  const top = useMemo(() => rankWorks(works, 'week', state.ops.charsPerSec).slice(0, 5).map((r) => r.work), [works, state.ops.charsPerSec]);
  const fresh = CREATORS.filter((c) => c.isNew || c.subscriberBase < 200).slice(0, 3);
  return (
    <aside className="rail" aria-label={t('인기 태그와 주간 인기 작품')}>
      <div className="rail-box">
        <p className="rail-title">{t('인기 해시태그')}</p>
        <div className="chip-row chip-wrap">
          {tags.map(([tag, n]) => (
            <Chip key={tag} onClick={() => push({ kind: 'tag', tag })}>
              #{tag} <span className="count">{n}</span>
            </Chip>
          ))}
        </div>
      </div>
      <div className="rail-box">
        <div className="row-between">
          <p className="rail-title">{t('주간 인기 작품')}</p>
          <Button size="sm" variant="ghost" onClick={() => push({ kind: 'ranking' })}>
            {t('전체 순위')}
          </Button>
        </div>
        {top.map((w, i) => (
          <div key={w.id} className="rail-row">
            <span className="rank-no">{i + 1}</span>
            <button type="button" className="row-plain row" onClick={() => push({ kind: 'work', id: w.id })} style={{ minHeight: 0, gap: 10 }}>
              <Cover category={w.category} hue={w.hue} cover={w.cover} size={40} />
              <span className="row-text">
                <span className="row-title">{w.title}</span>
                <span className="row-sub">{w.paid ? t('유료 {price}', { price: fmtKRW(w.priceKRW, t) }) : t('무료')}</span>
              </span>
            </button>
            <button type="button" className="play-pill" style={{ width: 36, height: 36 }} onClick={() => playWork(w.id)} aria-label={t('{title} 재생', { title: w.title })}>
              <Icon name="play" size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="rail-box">
        <p className="rail-title">{t('새 창작자')}</p>
        {fresh.map((c) => (
          <button key={c.id} type="button" className="rail-row" onClick={() => push({ kind: 'creator', id: c.id })}>
            <Avatar name={c.name} hue={c.hue} size={36} />
            <span className="row-text">
              <span className="row-title">{c.name}</span>
              <span className="row-sub">
                {t('구독자 {n}', { n: fmtCount(subscriberCount(c, state), lang) })} · {c.intro.slice(0, 18)}…
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export function App() {
  const { state, dispatch, works } = useStore();
  const t = useT();
  const player = usePlayer();
  const [tab, setTabState] = useState('home');
  const [stacks, setStacks] = useState({ home: [], discover: [], create: [], library: [], me: [] });
  const [loginOpen, setLoginOpen] = useState(false);
  const pending = useRef(null);
  const [purchaseId, setPurchaseId] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [draftId, setDraftId] = useState(undefined);
  const [createKey, setCreateKey] = useState(0);
  const { msg, show } = useToast();
  const mainRef = useRef(null);
  const page = stacks[tab][stacks[tab].length - 1];

  const push = useCallback(
    (p) => {
      setStacks((s) => ({ ...s, [tab]: [...s[tab], p] }));
      player.setExpanded(false);
    },
    [tab, player]
  );
  const back = useCallback(() => setStacks((s) => ({ ...s, [tab]: s[tab].slice(0, -1) })), [tab]);
  const setTab = useCallback(
    (id) => {
      if (id === tab) setStacks((s) => ({ ...s, [id]: [] }));
      setTabState(id);
      player.setExpanded(false);
    },
    [tab, player]
  );
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [tab, page]);

  const requireLogin = useCallback(
    (fn) => {
      if (state.loggedIn) fn();
      else {
        pending.current = fn;
        setLoginOpen(true);
      }
    },
    [state.loggedIn]
  );
  const playWork = useCallback((id, queue) => player.load(id, { autoplay: true, expanded: true, queue: queue ?? [] }), [player]);
  const share = useCallback(
    (id) => {
      const url = workLink(id);
      const ok = () => show(t('작품 링크를 복사했어요. 비구매자에게는 미리듣기만 열려요.'));
      try {
        navigator.clipboard.writeText(url).then(ok, () => show(t('링크: {url}', { url })));
      } catch {
        show(t('링크: {url}', { url }));
      }
    },
    [show, t]
  );

  useEffect(() => {
    const h = () => {
      const id = location.hash.replace(/^#/, '');
      if (!id) return;
      const w = works.find((x) => x.id === id);
      if (w) {
        setTabState('home');
        setStacks((s) => ({ ...s, home: [{ kind: 'work', id: w.id }] }));
        try {
          history.replaceState(null, '', location.pathname + location.search);
        } catch {}
      }
    };
    h();
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, [works]);

  const ctx = useMemo(
    () => ({
      tab,
      page,
      setTab,
      push,
      back,
      player,
      requireLogin,
      openPurchase: (id) => requireLogin(() => setPurchaseId(id)),
      openReport: (targetType, targetId) => requireLogin(() => setReportTarget({ targetType, targetId })),
      share,
      toast: show,
      playWork,
    }),
    [tab, page, setTab, push, back, player, requireLogin, share, show, playWork]
  );
  const cls = `app ${state.prefs.bigText ? 'big-text' : ''} ${state.prefs.easyMode ? 'easy' : ''}`;

  return (
    <AppCtx.Provider value={ctx}>
      <div className={cls}>
        <nav className="sidenav" aria-label={t('주 메뉴')}>
          <button type="button" className="side-brand brand-btn" onClick={() => setTab('home')} aria-label={t('홈으로')}>
            <Logo size={40} wordmark />
          </button>
          {TABS.filter((x) => x.id !== 'create').map((x) => (
            <button key={x.id} type="button" className={`side-item ${tab === x.id ? 'side-item-on' : ''}`} onClick={() => setTab(x.id)} aria-current={tab === x.id ? 'page' : undefined}>
              <Icon name={x.icon} size={22} />
              <span>{t(x.label)}</span>
            </button>
          ))}
          <button type="button" className="side-item side-create" onClick={() => setTab('create')} aria-current={tab === 'create' ? 'page' : undefined}>
            <Icon name="plus" size={22} />
            <span>{t('만들기')}</span>
          </button>
        </nav>
        <div className="center">
          {!state.onboarded && <Onboarding onDone={(interests) => dispatch({ type: 'onboard', interests })} />}
          <div className="demo-banner" role="note">
            {t('데모 — 모든 작품·창작자·수치는 시연용 가상 데이터 · 음성은 기기 내장 TTS · 결제·AI는 연결 전')}
          </div>
          <InstallBanner />
          <main className="content" ref={mainRef}>
            {page?.kind === 'shorts' ? (
              <Shorts startId={page.startId} />
            ) : (
              <Page
                tab={tab}
                page={page}
                draftId={draftId}
                createKey={createKey}
                onCreateDone={() => {
                  setDraftId(undefined);
                  setCreateKey((k) => k + 1);
                }}
                onOpenDraft={(id) => {
                  setDraftId(id);
                  setCreateKey((k) => k + 1);
                }}
              />
            )}
          </main>
          <MiniPlayer />
          <nav className="tabbar" aria-label={t('주 메뉴')}>
            {TABS.map((x) => (
              <button key={x.id} type="button" className={`tab ${tab === x.id ? 'tab-on' : ''} ${x.id === 'create' ? 'tab-create' : ''}`} onClick={() => setTab(x.id)} aria-current={tab === x.id ? 'page' : undefined}>
                <Icon name={x.icon} size={x.id === 'create' ? 28 : 22} />
                <span>{t(x.label)}</span>
              </button>
            ))}
          </nav>
          <FullPlayer />
          <LoginSheet
            open={loginOpen}
            onClose={() => {
              setLoginOpen(false);
              pending.current = null;
            }}
            onDone={() => {
              setLoginOpen(false);
              const fn = pending.current;
              pending.current = null;
              window.setTimeout(() => fn?.(), 0);
            }}
          />
          <PurchaseSheet workId={purchaseId} onClose={() => setPurchaseId(null)} onPlay={(id) => player.load(id, { autoplay: true, from: 0, expanded: true })} />
          <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
          <Toast msg={msg} />
        </div>
        <Rail />
      </div>
    </AppCtx.Provider>
  );
}
