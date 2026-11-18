import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT, CATEGORIES } from '../data.js';
import { displayName, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, Chip, Icon, Logo, coverStyle } from '../ui.jsx';
import { totalSec } from '../util.js';
import { PRESET, DEFAULT_VOICE } from '../speech.js';
import { fmtCount, fmtDur } from '../i18n.js';

// 틱톡식 세로 피드: 한 화면에 한 이야기. 커버가 배경, 아래쪽에 제목과 지금 읽는 문장, 오른쪽에 반응 버튼.
// 탭 = 재생/정지, 두 번 탭 = 좋아요, 위로 넘기면 다음 이야기(재생 중이면 자동으로 이어 재생).
export function Feed({ only, startId, title, backable = false }) {
  const { works, creators, state, dispatch, comments, lang } = useStore();
  const { player, playWork, push, back, requireLogin, share, setTab } = useApp();
  const t = useT();
  const cps = state.ops.charsPerSec;
  const [tabKind, setTabKind] = useState('reco');
  const [cat, setCat] = useState('all');
  const [cur, setCur] = useState(0);
  const [burst, setBurst] = useState(-1);
  const [flash, setFlash] = useState(null); // {i, kind:'play'|'pause'}
  const ref = useRef(null);
  const armed = useRef(false);
  const tap = useRef({ at: 0, timer: null });
  const curIdRef = useRef(null);

  const list = useMemo(() => {
    let l = works.filter((w) => !state.notInterested.includes(w.id));
    if (only === 'short') l = l.filter((w) => totalSec(w.sentences, cps) <= state.ops.shortMaxSec);
    if (!only && tabKind === 'subs') l = l.filter((w) => state.subscriptions.includes(w.creatorId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    else {
      if (cat !== 'all') l = l.filter((w) => w.category === cat);
      l = l
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
    }
    if (startId) {
      const i = l.findIndex((w) => w.id === startId);
      if (i > 0) l = [l[i], ...l.slice(0, i), ...l.slice(i + 1)];
    }
    return l;
  }, [works, state.notInterested, state.subscriptions, state.interests, state.lessFrom, state.completed, creators, only, tabKind, cat, cps, state.ops.shortMaxSec, startId]);

  // 보이는 카드 추적
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = [...el.querySelectorAll('[data-idx]')];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) setCur(Number(top.target.dataset.idx));
      },
      { root: el, threshold: [0.6] }
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [list.length, tabKind, cat]);

  // 카드가 바뀌면: 재생 중이었으면 새 카드를 이어서 재생, 아니면 이전 재생만 멈춤
  useEffect(() => {
    const w = list[cur];
    if (!w) return;
    if (curIdRef.current === w.id) return;
    curIdRef.current = w.id;
    const playing = player.ui.workId && player.ui.playing;
    if (playing && player.ui.workId !== w.id && armed.current) playWork(w.id, list.slice(cur + 1).map((x) => x.id));
    else if (player.ui.workId && player.ui.workId !== w.id && player.ui.playing) player.pause();
  }, [cur, list]); // eslint-disable-line

  useEffect(() => () => player.setExpanded(false), [player]);

  const togglePlay = (w, i) => {
    const isCur = player.ui.workId === w.id;
    if (isCur) {
      armed.current = !player.ui.playing;
      player.toggle();
      setFlash({ i, kind: player.ui.playing ? 'pause' : 'play' });
    } else {
      armed.current = true;
      playWork(w.id, list.slice(i + 1).map((x) => x.id));
      setFlash({ i, kind: 'play' });
    }
    window.setTimeout(() => setFlash(null), 600);
  };
  const like = (w, i) => {
    requireLogin(() => {
      if (!state.likes.includes(w.id)) dispatch({ type: 'toggleLike', workId: w.id });
    });
    setBurst(i);
    window.setTimeout(() => setBurst(-1), 700);
  };
  const onTap = (w, i) => {
    const now = Date.now();
    if (now - tap.current.at < 280) {
      window.clearTimeout(tap.current.timer);
      tap.current.at = 0;
      like(w, i);
      return;
    }
    tap.current.at = now;
    tap.current.timer = window.setTimeout(() => togglePlay(w, i), 280);
  };

  const header = (
    <div className="feed-top">
      <div className="feed-top-row">
        {backable ? (
          <button type="button" className="feed-icon" onClick={back} aria-label={t('뒤로')}>
            <Icon name="chevron-left" size={24} />
          </button>
        ) : (
          <Logo size={30} />
        )}
        {only ? (
          <span className="feed-title">{title}</span>
        ) : (
          <div className="feed-seg" role="tablist">
            <button type="button" role="tab" aria-selected={tabKind === 'subs'} className={tabKind === 'subs' ? 'on' : ''} onClick={() => setTabKind('subs')}>
              {t('구독 중')}
            </button>
            <button type="button" role="tab" aria-selected={tabKind === 'reco'} className={tabKind === 'reco' ? 'on' : ''} onClick={() => setTabKind('reco')}>
              {t('추천')}
            </button>
          </div>
        )}
        <button type="button" className="feed-icon" onClick={() => setTab('discover')} aria-label={t('검색')}>
          <Icon name="search" size={22} />
        </button>
      </div>
      {!only && tabKind === 'reco' && (
        <div className="chip-row feed-chips" role="group" aria-label={t('카테고리')}>
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>
            {t('전체')}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {t(c.short)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );

  if (list.length === 0)
    return (
      <div className="feed feed-empty" ref={ref}>
        {header}
        <div className="feed-empty-body">
          {tabKind === 'subs' && !only ? (
            <>
              <p className="feed-empty-title">{t('아직 구독한 창작자가 없어요')}</p>
              <p className="muted">{t('마음에 드는 이야기를 듣다가 작가를 구독하면, 새 작품이 여기에 모여요.')}</p>
              <button type="button" className="btn btn-primary" onClick={() => setTabKind('reco')}>
                {t('추천 보러 가기')}
              </button>
            </>
          ) : (
            <p className="muted">{t('아직 작품이 없어요.')}</p>
          )}
        </div>
      </div>
    );

  return (
    <div className="feed" ref={ref}>
      {header}
      {list.map((w, i) => {
        const isCur = player.ui.workId === w.id;
        const playing = isCur && player.ui.playing;
        const line = isCur ? player.sentenceIdx : -1;
        const liked = state.likes.includes(w.id);
        const saved = state.saves.includes(w.id);
        const creator = creators[w.creatorId];
        const subbed = state.subscriptions.includes(w.creatorId);
        const likes = (w.stats?.week?.likes ?? 0) + (liked ? 1 : 0);
        const nComments = comments.filter((c) => c.workId === w.id).length;
        const pct = isCur && player.total ? Math.min(100, (player.ui.time / player.total) * 100) : 0;
        const voice = t(PRESET[w.aiVoiceName]?.name ?? PRESET[DEFAULT_VOICE].name);
        const near = Math.abs(i - cur) <= 1;
        return (
          <section key={w.id} className={`fcard ${isCur ? 'fcard-cur' : ''}`} data-idx={i} style={near ? coverStyle(w.cover, w.hue, true) : undefined} aria-label={w.title}>
            <div className="fcard-shade" aria-hidden="true" />
            <button type="button" className="fcard-tap" onClick={() => onTap(w, i)} aria-label={playing ? t('일시정지') : t('재생')} />
            {burst === i && <Icon name="heart" size={120} className="fcard-burst" />}
            {flash?.i === i && (
              <span className="fcard-flash" aria-hidden="true">
                <Icon name={flash.kind} size={44} />
              </span>
            )}
            {!playing && (
              <span className="fcard-playhint" aria-hidden="true">
                <Icon name="play" size={34} />
              </span>
            )}

            <div className="fcard-bottom">
              <button type="button" className="fcard-creator" onClick={() => push({ kind: 'creator', id: w.creatorId })}>
                @{creator?.handle ?? displayName(creator, t)}
                {creator?.isNew && <span className="fcard-new">{t('새 창작자')}</span>}
              </button>
              <h2 className="fcard-title">
                <button type="button" onClick={() => push({ kind: 'work', id: w.id })}>
                  {w.title}
                </button>
              </h2>
              <div className="fcard-caption" aria-live={isCur ? 'polite' : undefined}>
                {isCur && line > 0 && <p className="fcard-prev">{w.sentences[line - 1]}</p>}
                <p className="fcard-now">
                  {isCur && w.speakers?.[line] && <span className="caption-who">{w.speakers[line]}</span>}
                  {isCur ? w.sentences[line] : w.intro || w.sentences[0]}
                </p>
              </div>
              <p className="fcard-meta">
                <span className="fcard-cat">{t(CAT[w.category].short)}</span>
                <span>{fmtDur(player.work?.id === w.id && player.hasAudio ? Math.round(player.total) : totalSec(w.sentences, cps), t)}</span>
                {w.paid && <span className="fcard-paid">{t('유료')}</span>}
                {w.tags.slice(0, 3).map((tg) => (
                  <button key={tg} type="button" className="fcard-tag" onClick={() => push({ kind: 'tag', tag: tg })}>
                    #{tg}
                  </button>
                ))}
              </p>
            </div>

            <div className="fcard-rail">
              <button type="button" className="rail-avatar" onClick={() => (subbed ? push({ kind: 'creator', id: w.creatorId }) : requireLogin(() => dispatch({ type: 'toggleSubscribe', creatorId: w.creatorId })))} aria-label={subbed ? t('{name} 프로필', { name: displayName(creator, t) }) : t('무료 구독')}>
                <Avatar name={creator?.name} hue={creator?.hue} size={44} />
                {!subbed && w.creatorId !== 'me' && (
                  <span className="rail-plus">
                    <Icon name="plus" size={12} />
                  </span>
                )}
              </button>
              <button type="button" className={`rail-btn ${liked ? 'rail-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleLike', workId: w.id }))} aria-pressed={liked}>
                <Icon name="heart" size={30} />
                <span>{fmtCount(likes, lang)}</span>
              </button>
              <button type="button" className="rail-btn" onClick={() => push({ kind: 'work', id: w.id })}>
                <Icon name="comment" size={28} />
                <span>{nComments ? fmtCount(nComments, lang) : t('댓글')}</span>
              </button>
              <button type="button" className={`rail-btn ${saved ? 'rail-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleSave', workId: w.id }))} aria-pressed={saved}>
                <Icon name="bookmark" size={28} />
                <span>{fmtCount(w.stats?.week?.saves ?? 0, lang)}</span>
              </button>
              <button type="button" className="rail-btn" onClick={() => share(w.id)}>
                <Icon name="share" size={28} />
                <span>{t('공유')}</span>
              </button>
              <button type="button" className="rail-btn" onClick={() => dispatch({ type: 'notInterested', workId: w.id })} aria-label={t('관심 없음')}>
                <Icon name="more" size={26} />
              </button>
              <button type="button" className={`rail-disc ${playing ? 'spin' : ''}`} onClick={() => push({ kind: 'settings', section: 'voice' })} aria-label={t('목소리')}>
                <span className="rail-disc-img" style={coverStyle(w.cover, w.hue, true)} />
              </button>
            </div>
            <span className="fcard-voice">
              <Icon name="voice" size={12} /> {voice}
            </span>
            <div className="fcard-progress" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
