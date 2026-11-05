import { useMemo, useState } from 'react';
import { useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Button, Empty, Icon, WorkList } from '../ui.jsx';
import { totalSec } from '../util.js';
import { relTime } from '../i18n.js';

export function Library({ onOpenDraft }) {
  const { state, works, dispatch, lang } = useStore();
  const { push, setTab } = useApp();
  const t = useT();
  const [tab, setTabL] = useState('continue');
  const cps = state.ops.charsPerSec;
  const cont = useMemo(
    () =>
      works.filter((w) => {
        const p = state.positions[w.id] ?? 0;
        return p > 3 && p < totalSec(w.sentences, cps) - 2;
      }),
    [works, state.positions, cps]
  );
  const saved = works.filter((w) => state.saves.includes(w.id));
  const liked = works.filter((w) => state.likes.includes(w.id));
  const bought = state.purchases.map((p) => works.find((w) => w.id === p.workId)).filter(Boolean);
  const tabs = [
    { id: 'continue', label: t('이어 듣기'), n: cont.length },
    { id: 'saved', label: t('저장'), n: saved.length },
    { id: 'liked', label: t('좋아요'), n: liked.length },
    { id: 'purchased', label: t('구매'), n: bought.length },
    { id: 'drafts', label: t('초안'), n: state.drafts.length },
  ];
  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="page-title">{t('보관함')}</h1>
      </header>
      <div className="chip-row">
        {tabs.map((x) => (
          <button key={x.id} type="button" className={`chip ${tab === x.id ? 'chip-on' : ''}`} onClick={() => setTabL(x.id)} aria-pressed={tab === x.id}>
            {x.label} {x.n > 0 && <span className="count">{x.n}</span>}
          </button>
        ))}
      </div>
      {tab === 'continue' && (cont.length ? <WorkList works={cont} /> : <Empty title={t('이어 들을 작품이 없어요')} desc={t('듣다 만 작품은 여기에서 이어서 들을 수 있어요. 위치는 이 기기에 저장돼요.')} />)}
      {tab === 'saved' && (saved.length ? <WorkList works={saved} queue /> : <Empty title={t('저장한 작품이 없어요')} desc={t('작품의 저장 버튼을 누르면 여기에 모여요.')} />)}
      {tab === 'liked' && (liked.length ? <WorkList works={liked} queue /> : <Empty title={t('좋아요한 작품이 없어요')} />)}
      {tab === 'purchased' &&
        (bought.length ? (
          <>
            <WorkList works={bought} queue />
            <Button variant="ghost" onClick={() => push({ kind: 'purchases' })}>
              {t('구매 내역·주문번호 보기')}
            </Button>
          </>
        ) : (
          <Empty title={t('구매한 작품이 없어요')} desc={t('유료 작품은 미리듣기 후 구매할 수 있어요. 구매한 작품은 다시 결제하지 않아요.')} />
        ))}
      {tab === 'drafts' &&
        (state.drafts.length ? (
          <div className="list">
            {state.drafts.map((d) => (
              <div key={d.id} className="row">
                <span className="row-text">
                  <span className="row-title">{d.title?.trim() || d.rawText.slice(0, 30) || t('(빈 초안)')}</span>
                  <span className="row-sub">
                    {d.status === 'failed' ? t('실패 · {reason}', { reason: d.failReason ?? '' }) : t('초안')} · {relTime(d.updatedAt, t, lang)} · {t('{n}자', { n: d.rawText.length })}
                  </span>
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onOpenDraft(d.id);
                    setTab('create');
                  }}
                >
                  {t('이어서')}
                </Button>
                <button type="button" className="icon-btn" aria-label={t('초안 삭제')} onClick={() => dispatch({ type: 'deleteDraft', id: d.id })}>
                  <Icon name="x" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title={t('초안이 없어요')}
            desc={t('만들기에서 적다 만 이야기는 자동으로 여기에 저장돼요.')}
            action={
              <Button variant="primary" onClick={() => setTab('create')}>
                {t('만들기로 가기')}
              </Button>
            }
          />
        ))}
    </div>
  );
}
