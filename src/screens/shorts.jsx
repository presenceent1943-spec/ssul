import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT } from '../data.js';
import { displayName, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Cover, Icon, SubscribeButton } from '../ui.jsx';
import { totalSec } from '../util.js';

export function Shorts({ startId }) {
  const { works, creators, state, dispatch } = useStore();
  const { player, playWork, back, requireLogin, share, push } = useApp();
  const t = useT();
  const list = useMemo(() => {
    const l = works.filter((w) => totalSec(w.sentences, state.ops.charsPerSec) <= state.ops.shortMaxSec && !state.notInterested.includes(w.id));
    if (startId) {
      const i = l.findIndex((w) => w.id === startId);
      if (i > 0) return [l[i], ...l.slice(0, i), ...l.slice(i + 1)];
    }
    return l;
  }, [works, state.ops, state.notInterested, startId]);
  const [cur, setCur] = useState(0);
  const ref = useRef(null);
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
  }, [list.length]);
  useEffect(() => {
    const w = list[cur];
    if (w && player.ui.workId && player.ui.workId !== w.id && player.ui.playing) player.pause();
  }, [cur]); // eslint-disable-line
  useEffect(() => () => player.setExpanded(false), [player]);
  if (list.length === 0)
    return (
      <div className="screen">
        <p className="muted">{t('짧은 작품이 아직 없어요.')}</p>
      </div>
    );
  return (
    <div className="shorts" ref={ref}>
      <button type="button" className="shorts-back icon-btn" onClick={back} aria-label={t('뒤로')}>
        <Icon name="chevron-left" size={24} />
      </button>
      {list.map((w, i) => {
        const isCur = player.ui.workId === w.id;
        const playing = isCur && player.ui.playing;
        const line = isCur ? player.sentenceIdx : -1;
        const liked = state.likes.includes(w.id);
        const saved = state.saves.includes(w.id);
        return (
          <section key={w.id} className="short" data-idx={i} aria-label={w.title}>
            <Cover category={w.category} hue={w.hue} cover={w.cover} size={64} />
            <div className="short-body">
              <p className="short-cat">
                {t(CAT[w.category].name)} · {w.tags.map((x) => `#${x}`).join(' ')}
              </p>
              <h2 className="short-title">{w.title}</h2>
              <div className="short-lines">
                {w.sentences.map((s, j) => (
                  <p key={j} className={`short-line ${j === line ? 'short-line-on' : ''} ${isCur && j < line ? 'short-line-done' : ''}`}>
                    {s}
                  </p>
                ))}
              </div>
              <button type="button" className="short-play" onClick={() => (isCur ? player.toggle() : playWork(w.id, list.slice(i + 1).map((x) => x.id)))} aria-label={playing ? t('일시정지') : t('재생')}>
                <Icon name={playing ? 'pause' : 'play'} size={28} />
                <span>{playing ? t('일시정지') : isCur ? t('이어서') : t('듣기')}</span>
              </button>
            </div>
            <div className="short-side">
              <button type="button" className="short-creator" onClick={() => push({ kind: 'creator', id: w.creatorId })}>
                {displayName(creators[w.creatorId], t)}
              </button>
              <SubscribeButton creatorId={w.creatorId} size="sm" />
              <button type="button" className={`side-btn ${liked ? 'side-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleLike', workId: w.id }))} aria-pressed={liked}>
                <Icon name="heart" />
                <span>{t('좋아요')}</span>
              </button>
              <button type="button" className={`side-btn ${saved ? 'side-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleSave', workId: w.id }))} aria-pressed={saved}>
                <Icon name="bookmark" />
                <span>{t('저장')}</span>
              </button>
              <button type="button" className="side-btn" onClick={() => share(w.id)}>
                <Icon name="share" />
                <span>{t('공유')}</span>
              </button>
              <button type="button" className="side-btn" onClick={() => dispatch({ type: 'notInterested', workId: w.id })}>
                <Icon name="eye-off" />
                <span>{t('관심 없음')}</span>
              </button>
            </div>
            <p className="short-hint">
              {t('위로 넘기면 다음 이야기 · 재생은 버튼으로')} · {i + 1}/{list.length}
            </p>
          </section>
        );
      })}
    </div>
  );
}
