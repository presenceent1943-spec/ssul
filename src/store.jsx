import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { CREATOR, DEMO_COMMENTS, WORKS } from './data.js';
import { makePurchase, toggleIn, uid } from './util.js';
import { makeT, detectLang } from './i18n.js';

export const DEFAULT_OPS = {
  maxTags: 5,
  paidMinSec: 180,
  previewMaxSec: 60,
  shortMaxSec: 60,
  paidEligibleSubs: 100,
  unitPriceKRW: 300,
  charsPerSec: 4,
  rankingShrinkM: 20,
  dailyGenerationLimit: 5,
  maxRetries: 3,
  tidyUrl: '',
};

export const DEFAULT_PREFS = {
  bigText: false,
  easyMode: false,
  autoplay: false,
  dataSaver: false,
  sleepSafe: true,
  speed: 1,
  voiceOn: true,
  theme: 'system', // system | light | dark
  lang: detectLang(),
  voiceMode: 'creator', // creator: 작가가 고른 목소리 / mine: 내가 고른 목소리
  myVoice: 'haneul', // 프리셋 id 또는 browser:<voiceURI>
  pitchAdj: 1,
  homeView: 'list', // list | grid
};

// 프로필 배경 프리셋 (꾸미기)
export const COVER_PRESETS = [
  { id: 'sunset', css: 'linear-gradient(135deg, #f6a085 0%, #c74720 60%, #7a2a12 100%)' },
  { id: 'night', css: 'linear-gradient(135deg, #2b2a55 0%, #1a1633 60%, #0d0b1f 100%)' },
  { id: 'forest', css: 'linear-gradient(135deg, #bfe3c0 0%, #4f9a63 60%, #1f4d2d 100%)' },
  { id: 'ocean', css: 'linear-gradient(135deg, #cfe9f7 0%, #3d8bbf 60%, #163d5c 100%)' },
  { id: 'peach', css: 'linear-gradient(135deg, #ffe4d1 0%, #f7b58c 60%, #e07a4f 100%)' },
  { id: 'lavender', css: 'linear-gradient(135deg, #ece4ff 0%, #a58ff0 60%, #5d3fb5 100%)' },
  { id: 'paper', css: 'repeating-linear-gradient(0deg, #f6eee4 0 28px, #eadfd3 28px 29px)' },
  { id: 'ink', css: 'radial-gradient(circle at 30% 20%, #4a3a30 0%, #241f1b 60%, #15110f 100%)' },
];

export const INITIAL = {
  loggedIn: false,
  me: { id: 'me', name: '나', handle: 'me', intro: '', hue: 170, cover: { kind: 'preset', id: 'sunset' }, nameMode: 'name' },
  onboarded: false,
  interests: [],
  subscriptions: [],
  likes: [],
  saves: [],
  purchases: [],
  comments: [],
  positions: {},
  completed: [],
  listens: {},
  myWorks: [],
  drafts: [],
  reports: [],
  blocked: [],
  notInterested: [],
  lessFrom: [],
  prefs: DEFAULT_PREFS,
  ops: DEFAULT_OPS,
  generationsToday: 0,
  paidApplications: [],
  notices: [],
  demoPaidEligible: false,
};

function notice(state, text, kind, params) {
  return [{ id: uid('n'), text, params, at: new Date().toISOString(), kind, read: false }, ...state.notices].slice(0, 50);
}

export function reducer(s, a) {
  switch (a.type) {
    case 'login':
      return { ...s, loggedIn: true, me: { ...s.me, name: a.name ?? s.me.name } };
    case 'logout':
      return { ...s, loggedIn: false };
    case 'onboard':
      return { ...s, onboarded: true, interests: a.interests };
    case 'toggleSubscribe': {
      const on = !s.subscriptions.includes(a.creatorId);
      const c = CREATOR[a.creatorId];
      return {
        ...s,
        subscriptions: toggleIn(s.subscriptions, a.creatorId),
        notices: on && c ? notice(s, '{name} 님을 구독했어요. 새 작품이 올라오면 알려 드릴게요.', 'subscribe', { name: c.name }) : s.notices,
      };
    }
    case 'toggleLike':
      return { ...s, likes: toggleIn(s.likes, a.workId) };
    case 'toggleSave':
      return { ...s, saves: toggleIn(s.saves, a.workId) };
    case 'addComment':
      return {
        ...s,
        comments: [...s.comments, { id: uid('c'), workId: a.workId, authorId: 'me', authorName: a.authorName, text: a.text, at: new Date().toISOString(), parentId: a.parentId }],
      };
    case 'setPosition':
      return { ...s, positions: { ...s.positions, [a.workId]: a.sec } };
    case 'markCompleted':
      return { ...s, completed: s.completed.includes(a.workId) ? s.completed : [...s.completed, a.workId], positions: { ...s.positions, [a.workId]: 0 } };
    case 'countListen':
      return { ...s, listens: { ...s.listens, [a.workId]: (s.listens[a.workId] ?? 0) + 1 } };
    case 'purchase': {
      const r = makePurchase(a.work, s.purchases);
      if (!r.ok || r.duplicate) return s;
      return { ...s, purchases: r.purchases, notices: notice(s, '「{title}」 데모 구매가 완료됐어요. 실제 결제는 일어나지 않았어요.', 'purchase', { title: a.work.title }) };
    }
    case 'saveDraft': {
      const has = s.drafts.some((d) => d.id === a.draft.id);
      return { ...s, drafts: has ? s.drafts.map((d) => (d.id === a.draft.id ? a.draft : d)) : [a.draft, ...s.drafts] };
    }
    case 'deleteDraft':
      return { ...s, drafts: s.drafts.filter((d) => d.id !== a.id) };
    case 'publishWork':
      return {
        ...s,
        myWorks: [a.work, ...s.myWorks.filter((w) => w.id !== a.work.id)],
        drafts: s.drafts.filter((d) => d.id !== a.draftId),
        notices: notice(s, '「{title}」이(가) 게시됐어요.', 'create', { title: a.work.title }),
      };
    case 'unpublishWork':
      return { ...s, myWorks: s.myWorks.filter((w) => w.id !== a.workId) };
    case 'updateWorkCover':
      return { ...s, myWorks: s.myWorks.map((w) => (w.id === a.workId ? { ...w, cover: a.cover } : w)) };
    case 'report':
      return {
        ...s,
        reports: [{ id: uid('r'), targetType: a.targetType, targetId: a.targetId, reason: a.reason, detail: a.detail, at: new Date().toISOString(), status: 'open' }, ...s.reports],
        notices: notice(s, '신고가 접수됐어요. 운영팀 검토 후 결과를 알려 드릴게요.', 'report'),
      };
    case 'actOnReport':
      return {
        ...s,
        reports: s.reports.map((r) => (r.id === a.reportId ? { ...r, status: a.kind === 'dismiss' ? 'dismissed' : 'actioned', action: { kind: a.kind, note: a.note, at: new Date().toISOString() } } : r)),
      };
    case 'toggleBlock':
      return { ...s, blocked: toggleIn(s.blocked, a.creatorId), subscriptions: s.subscriptions.filter((c) => c !== a.creatorId) };
    case 'notInterested':
      return { ...s, notInterested: toggleIn(s.notInterested, a.workId) };
    case 'lessFrom':
      return { ...s, lessFrom: toggleIn(s.lessFrom, a.creatorId) };
    case 'setPrefs':
      return { ...s, prefs: { ...s.prefs, ...a.prefs } };
    case 'setOps':
      return { ...s, ops: { ...s.ops, ...a.ops } };
    case 'useGeneration':
      return { ...s, generationsToday: s.generationsToday + 1 };
    case 'updateProfile':
      return { ...s, me: { ...s.me, ...a.me } };
    case 'applyPaid':
      return { ...s, paidApplications: [a.app, ...s.paidApplications], notices: notice(s, '유료화 신청이 접수됐어요. 운영 심사 후 결과를 알려 드릴게요.', 'system') };
    case 'decidePaid':
      return {
        ...s,
        paidApplications: s.paidApplications.map((p) => (p.id === a.id ? { ...p, status: a.status, note: a.note } : p)),
        notices: notice(s, a.status === 'approved' ? '유료화 신청이 승인됐어요.' : '유료화 신청이 반려됐어요. 사유: {note}', 'system', { note: a.note }),
      };
    case 'notice':
      return { ...s, notices: notice(s, a.text, a.kind, a.params) };
    case 'readNotices':
      return { ...s, notices: s.notices.map((n) => ({ ...n, read: true })) };
    case 'setDemoPaidEligible':
      return { ...s, demoPaidEligible: a.value };
    case 'reset':
      return { ...INITIAL, prefs: { ...DEFAULT_PREFS, lang: s.prefs.lang, theme: s.prefs.theme } };
    default:
      return s;
  }
}

const KEY = 'ssul.proto.v2';

function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) raw = localStorage.getItem('ssul.proto.v1');
    if (!raw) return INITIAL;
    const p = JSON.parse(raw);
    return {
      ...INITIAL,
      ...p,
      me: { ...INITIAL.me, ...(p.me ?? {}) },
      prefs: { ...DEFAULT_PREFS, ...(p.prefs ?? {}) },
      ops: { ...DEFAULT_OPS, ...(p.ops ?? {}) },
    };
  } catch {
    return INITIAL;
  }
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

const StoreCtx = createContext(null);

export function StoreProvider({ children, initial }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initial ?? load());
  useEffect(() => {
    save(state);
  }, [state]);

  // 테마·언어를 문서에 반영
  useEffect(() => {
    const root = document.documentElement;
    if (state.prefs.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = state.prefs.theme;
    root.lang = state.prefs.lang;
    const tt = makeT(state.prefs.lang);
    root.style.setProperty('--txt-open', JSON.stringify(tt('열기')));
    root.style.setProperty('--txt-close', JSON.stringify(tt('접기')));
  }, [state.prefs.theme, state.prefs.lang]);

  const t = useMemo(() => makeT(state.prefs.lang), [state.prefs.lang]);

  const creators = useMemo(
    () => ({
      ...CREATOR,
      me: { id: 'me', name: state.me.name, handle: state.me.handle, intro: state.me.intro, subscriberBase: 0, joinedAt: '2026-11-03', hue: state.me.hue, cover: state.me.cover, nameMode: state.me.nameMode },
    }),
    [state.me]
  );
  const works = useMemo(
    () => [...state.myWorks.filter((w) => w.status === 'published'), ...WORKS].filter((w) => !state.blocked.includes(w.creatorId)),
    [state.myWorks, state.blocked]
  );
  const comments = useMemo(() => [...DEMO_COMMENTS, ...state.comments], [state.comments]);
  const value = useMemo(() => ({ state, dispatch, works, creators, comments, t, lang: state.prefs.lang }), [state, works, creators, comments, t]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}

export function useT() {
  return useStore().t;
}

export function subscriberCount(creator, state) {
  return creator.subscriberBase + (state.subscriptions.includes(creator.id) ? 1 : 0);
}

// 이름 표시 방식(본인 프로필 설정) 반영
export function displayName(creator, t) {
  if (!creator) return '';
  if (creator.id === 'me') {
    if (creator.nameMode === 'anon') return t('익명');
    if (creator.nameMode === 'handle') return `@${creator.handle}`;
  }
  return creator.name;
}
