import { useMemo, useState } from 'react';
import { CAT, SERIE, SERIES } from '../data.js';
import { displayName, subscriberCount, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, BackBar, Badge, Button, Chip, Cover, Empty, Icon, Meta, MoreText, ORIGIN_LABEL, SectionHead, SubscribeButton, WorkList } from '../ui.jsx';
import { canAccess, previewCutoff, previewSentenceCount, totalSec } from '../util.js';
import { fmtCount, fmtDur, fmtKRW, relTime } from '../i18n.js';

export function WorkDetail({ id }) {
  const { works, creators, state, dispatch, comments, lang } = useStore();
  const { push, playWork, requireLogin, openPurchase, openReport, share } = useApp();
  const t = useT();
  const w = works.find((x) => x.id === id);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [showScript, setShowScript] = useState(false);
  if (!w)
    return (
      <div className="screen">
        <BackBar title={t('작품')} />
        <Empty title={t('작품을 찾을 수 없어요')} desc={t('삭제됐거나 차단한 창작자의 작품일 수 있어요.')} />
      </div>
    );
  const creator = creators[w.creatorId];
  const total = totalSec(w.sentences, state.ops.charsPerSec);
  const access = canAccess(w, state.purchases, w.creatorId === 'me');
  const cut = previewCutoff(w.sentences, state.ops);
  const liked = state.likes.includes(w.id);
  const saved = state.saves.includes(w.id);
  const series = w.seriesId ? SERIE[w.seriesId] : undefined;
  const others = works.filter((x) => x.creatorId === w.creatorId && x.id !== w.id).slice(0, 4);
  const all = comments.filter((c) => c.workId === w.id);
  const roots = all.filter((c) => !c.parentId);
  const replies = (pid) => all.filter((c) => c.parentId === pid);
  const pos = state.positions[w.id] ?? 0;
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    requireLogin(() => {
      dispatch({ type: 'addComment', workId: w.id, text: v, parentId: replyTo?.id, authorName: displayName(creators.me, t) });
      setText('');
      setReplyTo(null);
    });
  };
  const previewN = Math.max(1, previewSentenceCount(w.sentences, state.ops.previewMaxSec, state.ops.charsPerSec));
  return (
    <div className="screen">
      <BackBar
        title={series ? series.title : t(CAT[w.category].name)}
        right={
          <button type="button" className="icon-btn" aria-label={t('신고')} onClick={() => openReport('work', w.id)}>
            <Icon name="flag" />
          </button>
        }
      />
      <div className="detail-hero">
        <Cover category={w.category} hue={w.hue} cover={w.cover} size={104} label={w.episodeNo ? t('{n}화', { n: w.episodeNo }) : undefined} />
        <div className="detail-text">
          <h1 className="detail-title">{w.title}</h1>
          <button type="button" className="link-btn" onClick={() => push({ kind: 'creator', id: w.creatorId })}>
            {displayName(creator, t)}
          </button>
          <Meta work={w} />
          <div className="work-tags">
            {w.isDemo && <Badge>{t('데모 콘텐츠')}</Badge>}
            {w.creatorId === 'me' && <Badge tone="accent">{t('내 작품')}</Badge>}
          </div>
        </div>
      </div>
      <p className="detail-intro">{w.intro}</p>
      <div className="card card-soft snippet-card">
        <p className="label">{t('어떤 이야기인지 살짝')}</p>
        <MoreText text={w.sentences.slice(0, previewN).join(' ') + (w.sentences.length > previewN ? ' …' : '')} lines={3} className="script-snippet" />
      </div>
      <div className="chip-row chip-wrap">
        {w.tags.map((tg) => (
          <button key={tg} type="button" className="chip" onClick={() => push({ kind: 'tag', tag: tg })}>
            #{tg}
          </button>
        ))}
      </div>
      <div className="detail-cta">
        <Button variant="primary" size="lg" icon="play" block onClick={() => playWork(w.id)}>
          {pos > 3 && pos < total - 2 ? t('이어 듣기 ({at}부터)', { at: fmtDur(pos, t) }) : access ? t('듣기') : t('미리듣기 {dur}', { dur: fmtDur(cut, t) })}
        </Button>
        {!access && (
          <Button variant="warm" size="lg" icon="lock" block onClick={() => openPurchase(w.id)}>
            {t('전체 듣기 약 {price}', { price: fmtKRW(w.priceKRW, t) })}
          </Button>
        )}
      </div>
      {!access && <p className="muted small">{t('전체 {total} 중 처음 {cut}을 무료로 들을 수 있어요. 구매 전에 전체 길이·가격·이용 범위를 확인할 수 있어요.', { total: fmtDur(total, t), cut: fmtDur(cut, t) })}</p>}
      <div className="action-row">
        <button type="button" className={`action ${liked ? 'action-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleLike', workId: w.id }))} aria-pressed={liked}>
          <Icon name="heart" />
          <span>
            {t('좋아요')} {fmtCount(w.stats.month.likes + (liked ? 1 : 0), lang)}
          </span>
        </button>
        <button type="button" className={`action ${saved ? 'action-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleSave', workId: w.id }))} aria-pressed={saved}>
          <Icon name="bookmark" />
          <span>{saved ? t('저장됨') : t('저장')}</span>
        </button>
        <button type="button" className="action" onClick={() => share(w.id)}>
          <Icon name="share" />
          <span>{t('공유')}</span>
        </button>
        <button type="button" className="action" onClick={() => setShowScript((s) => !s)} aria-expanded={showScript}>
          <Icon name="text" />
          <span>{t('원문')}</span>
        </button>
      </div>
      {showScript && (
        <div className="card">
          {access ? (
            <MoreText text={w.sentences.join(' ')} lines={6} className="script-text" />
          ) : (
            <>
              <p className="script-text">{w.sentences.slice(0, previewN).join(' ')} …</p>
              <p className="muted small">{t('구매 후 원문 전체를 볼 수 있어요. 비구매자에게는 전체 원문을 보내지 않아요.')}</p>
            </>
          )}
          <p className="muted small">{t('{origin} 표시는 작성자가 직접 고른 것이며, 플랫폼이 사실 여부를 검증했다는 뜻이 아니에요.', { origin: t(ORIGIN_LABEL[w.origin]) })}</p>
        </div>
      )}
      {series && (
        <>
          <SectionHead
            title={series.title}
            action={
              <Button size="sm" variant="ghost" onClick={() => push({ kind: 'series', id: series.id })}>
                {t('전체 회차')}
              </Button>
            }
          />
          <WorkList works={series.episodeIds.map((eid) => works.find((x) => x.id === eid)).filter(Boolean)} queue showCreator={false} />
        </>
      )}
      {creator && (
        <div className="card creator-card">
          <button type="button" className="row row-plain" onClick={() => push({ kind: 'creator', id: creator.id })}>
            <Avatar name={creator.name} hue={creator.hue} size={44} anon={creator.id === 'me' && creator.nameMode === 'anon'} />
            <span className="row-text">
              <span className="row-title">{displayName(creator, t)}</span>
              <span className="row-sub">
                {t('구독자 {n}', { n: fmtCount(subscriberCount(creator, state), lang) })} · {t('작품 {n}편', { n: works.filter((x) => x.creatorId === creator.id).length })}
              </span>
            </span>
          </button>
          <SubscribeButton creatorId={creator.id} size="sm" />
        </div>
      )}
      {others.length > 0 && (
        <>
          <SectionHead title={t('{name}의 다른 작품', { name: displayName(creator, t) })} />
          <WorkList works={others} queue showCreator={false} />
        </>
      )}
      <SectionHead title={t('댓글 {n}', { n: all.length })} />
      <div className="comment-form">
        {replyTo && (
          <p className="small muted">
            {t('{name}님에게 답글 ·', { name: replyTo.authorName })}{' '}
            <button type="button" className="link-btn" onClick={() => setReplyTo(null)}>
              {t('취소')}
            </button>
          </p>
        )}
        <div className="comment-input">
          <input id="comment-input" type="text" placeholder={state.loggedIn ? t('댓글을 남겨 보세요') : t('댓글은 로그인 후 남길 수 있어요')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} aria-label={t('댓글 입력')} />
          <Button variant="primary" size="sm" onClick={submit}>
            {t('등록')}
          </Button>
        </div>
      </div>
      {roots.length === 0 ? (
        <p className="muted small">{t('첫 댓글을 남겨 보세요.')}</p>
      ) : (
        <div className="comments">
          {roots.map((c) => (
            <div key={c.id} className="comment">
              <CommentBody c={c} onReply={() => setReplyTo(c)} onReport={() => openReport('comment', c.id)} />
              {replies(c.id).map((r) => (
                <div key={r.id} className="comment comment-reply">
                  <CommentBody c={r} onReply={() => setReplyTo(c)} onReport={() => openReport('comment', r.id)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentBody({ c, onReply, onReport }) {
  const t = useT();
  const { lang } = useStore();
  return (
    <div className="comment-body">
      <div className="comment-head">
        <strong>{c.authorName}</strong>
        <span className="muted small">{relTime(c.at, t, lang)}</span>
        {c.isDemo && <span className="demo-mini">{t('데모')}</span>}
      </div>
      <p>{c.text}</p>
      <div className="comment-actions">
        <button type="button" className="link-btn small" onClick={onReply}>
          {t('답글')}
        </button>
        <button type="button" className="link-btn small" onClick={onReport}>
          {t('신고')}
        </button>
      </div>
    </div>
  );
}

export function SeriesPage({ id }) {
  const { works, creators, state } = useStore();
  const { playWork } = useApp();
  const t = useT();
  const s = SERIE[id];
  const eps = useMemo(() => (s ? s.episodeIds.map((eid) => works.find((w) => w.id === eid)).filter(Boolean) : []), [s, works]);
  if (!s)
    return (
      <div className="screen">
        <BackBar title={t('연재')} />
        <Empty title={t('연재를 찾을 수 없어요')} />
      </div>
    );
  const creator = creators[s.creatorId];
  const next = eps.find((e) => !state.completed.includes(e.id)) ?? eps[0];
  return (
    <div className="screen">
      <BackBar title={t('연재')} />
      <h1 className="detail-title">{s.title}</h1>
      <p className="muted">
        {displayName(creator, t)} · {t('{n}화', { n: eps.length })} · {fmtDur(eps.reduce((a, e) => a + totalSec(e.sentences, state.ops.charsPerSec), 0), t)}
      </p>
      <p className="detail-intro">{s.desc}</p>
      {next && (
        <Button variant="primary" size="lg" icon="play" block onClick={() => playWork(next.id, eps.map((e) => e.id))}>
          {t('{n}화부터 이어 듣기', { n: next.episodeNo })}
        </Button>
      )}
      <SectionHead title={t('회차')} sub={t('유료 회차는 미리듣기 후 구매 여부를 직접 고르세요. 자동으로 결제되지 않아요.')} />
      <WorkList works={eps} queue showCreator={false} />
    </div>
  );
}

export { SERIES };
