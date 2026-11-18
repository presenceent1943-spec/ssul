import { useEffect, useMemo, useRef } from 'react';
import { CAT, CATEGORIES } from '../data.js';
import { displayName, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, Button, Chip, Icon, Logo, MoreText, SubscribeButton, coverStyle } from '../ui.jsx';
import { totalSec } from '../util.js';
import { PRESET, DEFAULT_VOICE } from '../speech.js';
import { fmtCount, fmtDur, relTime } from '../i18n.js';

// 인스타그램 피드 + 유튜브 홈을 섞은 카드 피드.
// 위: 스토리 줄(30초 썰·새 작품 올린 창작자), 카테고리 칩. 아래: 작가 → 커버(재생) → 반응 줄 → 제목·소개·태그 카드.

function isRecent(iso, days = 7) {
  return Date.now() - new Date(iso).getTime() < days * 864e5;
}

export function StoriesRow({ works }) {
  const { creators, state } = useStore();
  const { push, setTab } = useApp();
  const t = useT();
  const items = useMemo(() => {
    const latest = {};
    for (const w of works) {
      const c = w.creatorId;
      if (!latest[c] || w.publishedAt > latest[c]) latest[c] = w.publishedAt;
    }
    return Object.entries(latest)
      .filter(([id]) => creators[id] && id !== 'me')
      .sort((a, b) => {
        const sa = state.subscriptions.includes(a[0]) ? 1 : 0;
        const sb = state.subscriptions.includes(b[0]) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        return b[1].localeCompare(a[1]);
      })
      .map(([id, at]) => ({ c: creators[id], fresh: isRecent(at) }));
  }, [works, creators, state.subscriptions]);
  return (
    <div className="stories" role="list" aria-label={t('새 소식')}>
      <button type="button" className="story" role="listitem" onClick={() => setTab('shorts')}>
        <span className="story-ring story-short">
          <span className="story-inner story-icon">
            <Icon name="clock" size={24} />
          </span>
        </span>
        <span className="story-name">{t('30초 썰')}</span>
      </button>
      {items.map(({ c, fresh }) => (
        <button key={c.id} type="button" className="story" role="listitem" onClick={() => push({ kind: 'creator', id: c.id })}>
          <span className={`story-ring ${fresh ? '' : 'story-seen'}`}>
            <span className="story-inner">
              <Avatar name={c.name} hue={c.hue} size={58} />
            </span>
          </span>
          <span className="story-name">{displayName(c, t)}</span>
        </button>
      ))}
    </div>
  );
}

export function CategoryChips({ value, onChange, short = true }) {
  const t = useT();
  return (
    <div className="chip-row chips-cat" role="group" aria-label={t('카테고리')}>
      <Chip active={value === 'all'} onClick={() => onChange('all')}>
        {t('전체')}
      </Chip>
      {CATEGORIES.map((c) => (
        <Chip key={c.id} active={value === c.id} onClick={() => onChange(c.id)} className="chip-cat" style={{ '--h': c.hue }}>
          {t(short ? c.short : c.name)}
        </Chip>
      ))}
    </div>
  );
}

export function PostCard({ work: w, queue }) {
  const { state, creators, comments, lang, dispatch } = useStore();
  const { player, playWork, push, requireLogin, share } = useApp();
  const t = useT();
  const creator = creators[w.creatorId];
  const isCur = player.ui.workId === w.id;
  const playing = isCur && player.ui.playing;
  const line = isCur ? player.sentenceIdx : -1;
  const liked = state.likes.includes(w.id);
  const saved = state.saves.includes(w.id);
  const likes = (w.stats?.week?.likes ?? 0) + (liked ? 1 : 0);
  const nComments = comments.filter((c) => c.workId === w.id).length;
  const pct = isCur && player.total ? Math.min(100, (player.ui.time / player.total) * 100) : 0;
  const dur = isCur && player.hasAudio ? Math.round(player.total) : totalSec(w.sentences, state.ops.charsPerSec);
  const cat = CAT[w.category];
  const ref = useRef(null);
  // 인스타처럼 카드 안에서 바로 재생 (전체 플레이어는 미니 플레이어를 누르면)
  const toggle = () => {
    if (isCur) player.toggle();
    else {
      playWork(w.id, queue, { expanded: false });
      window.setTimeout(() => ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    }
  };
  return (
    <article ref={ref} className={`post ${isCur ? 'post-cur' : ''}`}>
      <div className="post-head">
        <button type="button" className="post-author" onClick={() => push({ kind: 'creator', id: w.creatorId })}>
          <Avatar name={creator?.name} hue={creator?.hue} size={36} anon={creator?.id === 'me' && creator?.nameMode === 'anon'} />
          <span className="post-author-text">
            <span className="post-author-name">{displayName(creator, t)}</span>
            <span className="post-author-sub">
              {relTime(w.publishedAt, t, lang)}
              {w.seriesId && w.episodeNo ? ` · ${t('{n}화', { n: w.episodeNo })}` : ''}
            </span>
          </span>
        </button>
        <SubscribeButton creatorId={w.creatorId} size="sm" />
        <button type="button" className="icon-btn post-more" onClick={() => dispatch({ type: 'notInterested', workId: w.id })} aria-label={t('관심 없음')}>
          <Icon name="more" size={20} />
        </button>
      </div>

      <button type="button" className="post-media" style={coverStyle(w.cover, w.hue, true)} onClick={toggle} aria-label={playing ? t('일시정지') : t('{title} 재생', { title: w.title })}>
        <span className="post-cat" style={{ '--h': cat.hue }}>
          {t(cat.short)}
        </span>
        {w.paid && (
          <span className="post-lock">
            <Icon name="lock" size={12} /> {t('유료')}
          </span>
        )}
        {!isCur && <span className="post-dur">{fmtDur(dur, t)}</span>}
        {!playing && (
          <span className="post-play">
            <Icon name="play" size={30} />
          </span>
        )}
        {isCur && (
          <span className="post-caption" aria-live="polite">
            {line > 0 && <span className="post-prev">{w.sentences[line - 1]}</span>}
            <span className="post-now">
              {w.speakers?.[line] && <span className="caption-who">{w.speakers[line]}</span>}
              {w.sentences[line]}
            </span>
          </span>
        )}
        {isCur && (
          <span className="post-progress" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </button>

      <div className="post-actions">
        <button type="button" className={`post-act ${liked ? 'post-act-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleLike', workId: w.id }))} aria-pressed={liked}>
          <Icon name="heart" size={26} />
          <span>{fmtCount(likes, lang)}</span>
        </button>
        <button type="button" className="post-act" onClick={() => push({ kind: 'work', id: w.id })}>
          <Icon name="comment" size={24} />
          <span>{nComments || ''}</span>
        </button>
        <button type="button" className="post-act" onClick={() => share(w.id)} aria-label={t('공유')}>
          <Icon name="share" size={24} />
        </button>
        <span className="post-spacer" />
        <button type="button" className={`post-act ${saved ? 'post-act-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleSave', workId: w.id }))} aria-pressed={saved} aria-label={t('저장')}>
          <Icon name="bookmark" size={24} />
        </button>
      </div>

      <div className="post-body">
        <h3 className="post-title">
          <button type="button" onClick={() => push({ kind: 'work', id: w.id })}>
            {w.title}
          </button>
        </h3>
        <MoreText text={(w.intro ? w.intro + '\n' : '') + w.sentences.slice(0, 3).join(' ') + (w.sentences.length > 3 ? ' …' : '')} lines={2} className="post-snippet" />
        {w.tags.length > 0 && (
          <p className="post-tags">
            {w.tags.slice(0, 4).map((tg) => (
              <button key={tg} type="button" onClick={() => push({ kind: 'tag', tag: tg })}>
                #{tg}
              </button>
            ))}
          </p>
        )}
        <p className="post-meta">
          {t('청취 {n}', { n: fmtCount(w.stats?.week?.validListens ?? 0, lang) })} · {t(PRESET[w.aiVoiceName]?.name ?? PRESET[DEFAULT_VOICE].name)} {t('목소리')}
          {w.cast && Object.keys(w.cast).length ? ` · ${t('등장인물 {n}명', { n: Object.keys(w.cast).length })}` : ''}
        </p>
      </div>
    </article>
  );
}

export function PostFeed({ works, queue = true, emptyText }) {
  const t = useT();
  if (!works.length) return <p className="muted small">{emptyText ?? t('아직 작품이 없어요.')}</p>;
  const ids = works.map((w) => w.id);
  return (
    <div className="posts">
      {works.map((w, i) => (
        <PostCard key={w.id} work={w} queue={queue ? ids.slice(i + 1) : undefined} />
      ))}
    </div>
  );
}

export function HomePosts() {
  const { state, works, creators } = useStore();
  const { push, setTab } = useApp();
  const t = useT();
  const cat = state.prefs.homeCat ?? 'all';
  const feed = state.prefs.homeFeed ?? 'reco';
  const { dispatch } = useStore();
  const setCat = (v) => dispatch({ type: 'setPrefs', prefs: { homeCat: v } });
  const setFeed = (v) => dispatch({ type: 'setPrefs', prefs: { homeFeed: v } });
  const visible = useMemo(() => works.filter((w) => !state.notInterested.includes(w.id)), [works, state.notInterested]);
  const list = useMemo(() => {
    if (feed === 'subs') return visible.filter((w) => state.subscriptions.includes(w.creatorId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return visible
      .filter((w) => cat === 'all' || w.category === cat)
      .map((w) => {
        let s = Math.log1p(w.stats.week.validListens);
        if (state.interests.includes(w.category)) s += 2;
        if (creators[w.creatorId]?.isNew) s += 1.2;
        if (state.lessFrom.includes(w.creatorId)) s -= 3;
        if (state.completed.includes(w.id)) s -= 1;
        s += ((w.id.charCodeAt(2) % 7) * 0.1);
        return { w, s };
      })
      .sort((a, b) => b.s - a.s)
      .map((x) => x.w);
  }, [visible, feed, cat, state.subscriptions, state.interests, state.lessFrom, state.completed, creators]);

  return (
    <div className="screen screen-posts">
      <header className="topbar">
        <div className="brand">
          <Logo size={32} wordmark />
        </div>
        <div className="topbar-actions">
          <button type="button" className="icon-btn" onClick={() => setTab('discover')} aria-label={t('검색')}>
            <Icon name="search" size={24} />
          </button>
          <button type="button" className="icon-btn" onClick={() => push({ kind: 'notifications' })} aria-label={t('알림')}>
            <Icon name="bell" size={24} />
            {state.notices.some((n) => !n.read) && <span className="dot" aria-hidden="true" />}
          </button>
        </div>
      </header>
      <StoriesRow works={visible} />
      <div className="row-between posts-tabs">
        <div className="feed-seg feed-seg-dark" role="tablist" aria-label={t('피드 선택')}>
          <button type="button" role="tab" aria-selected={feed === 'reco'} className={feed === 'reco' ? 'on' : ''} onClick={() => setFeed('reco')}>
            {t('추천')}
          </button>
          <button type="button" role="tab" aria-selected={feed === 'subs'} className={feed === 'subs' ? 'on' : ''} onClick={() => setFeed('subs')}>
            {t('구독 중')}
            {state.subscriptions.length > 0 && <span className="count">{state.subscriptions.length}</span>}
          </button>
        </div>
        <Button size="sm" variant="ghost" icon="star" className="btn-more" onClick={() => push({ kind: 'ranking' })}>
          {t('인기순위')}
        </Button>
      </div>
      {feed === 'reco' && <CategoryChips value={cat} onChange={setCat} />}
      {feed === 'subs' && state.subscriptions.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{t('아직 구독한 창작자가 없어요')}</p>
          <p className="muted">{t('마음에 드는 이야기를 듣다가 작가를 구독하면, 새 작품이 여기에 모여요.')}</p>
          <Button variant="primary" onClick={() => setFeed('reco')}>
            {t('추천 보러 가기')}
          </Button>
        </div>
      ) : (
        <PostFeed works={list} emptyText={feed === 'subs' ? t('구독한 창작자의 작품이 아직 없어요.') : undefined} />
      )}
    </div>
  );
}
