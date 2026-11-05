import { useEffect, useState } from 'react';
import { CATEGORIES } from '../data.js';
import { useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { BackBar, Badge, Button, Chip, Empty, Logo, SectionHead, Sheet, Toggle } from '../ui.jsx';
import { isPurchased, previewCutoff, subsOk, totalSec, uid } from '../util.js';
import { LANGS, fmtDur, fmtKRW, relTime } from '../i18n.js';
import { paidStatusLabel } from './me.jsx';

export function Purchases() {
  const { state, works, lang } = useStore();
  const t = useT();
  return (
    <div className="screen">
      <BackBar title={t('구매 내역')} />
      {state.purchases.length === 0 ? (
        <Empty title={t('구매 내역이 없어요')} />
      ) : (
        <div className="list">
          {state.purchases.map((p) => (
            <div key={p.orderId} className="row">
              <span className="row-text">
                <span className="row-title">{works.find((w) => w.id === p.workId)?.title ?? p.workId}</span>
                <span className="row-sub">
                  {fmtKRW(p.priceKRW, t)} · {relTime(p.at, t, lang)} · {t('주문번호 {id}', { id: p.orderId })} · <strong>{t('데모 결제')}</strong>
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="muted small">{t('실제 결제 연동 뒤에는 결제 수단·영수증·환불 신청이 여기에 들어가요. 환불은 서버에서 결제 이벤트와 대조해 처리해요.')}</p>
    </div>
  );
}

export function Stats() {
  const { state, works } = useStore();
  const t = useT();
  const mine = works.filter((w) => w.creatorId === 'me');
  return (
    <div className="screen">
      <BackBar title={t('창작자 통계')} />
      <div className="card card-soft small">
        <strong>{t('이 기기에서 기록된 청취만 집계돼요.')}</strong> {t('실제 서비스에서는 서버의 청취 이벤트(유효 청취·평균 청취 시간·완청률·저장·공유·신규 구독·구매 전환)를 집계해요. 수집하지 않은 수치는 표시하지 않아요.')}
      </div>
      {mine.length === 0 ? (
        <Empty title={t('아직 작품이 없어요')} desc={t('작품을 게시하면 작품별 통계가 여기 보여요.')} />
      ) : (
        <div className="list">
          {mine.map((w) => {
            const n = state.listens[w.id] ?? 0;
            const done = state.completed.includes(w.id);
            return (
              <div key={w.id} className="stat-card">
                <strong>{w.title}</strong>
                <dl className="kv kv-tight">
                  <dt>{t('길이')}</dt>
                  <dd>{fmtDur(totalSec(w.sentences, state.ops.charsPerSec), t)}</dd>
                  <dt>{t('완청(이 기기)')}</dt>
                  <dd>{t('{n}회', { n })}</dd>
                  <dt>{t('완청률')}</dt>
                  <dd>{n > 0 ? t('100% (표본 부족)') : done ? '—' : t('집계 전')}</dd>
                  <dt>{t('좋아요·저장')}</dt>
                  <dd>
                    {state.likes.includes(w.id) ? 1 : 0} · {state.saves.includes(w.id) ? 1 : 0}
                  </dd>
                  <dt>{t('신규 구독·구매 전환')}</dt>
                  <dd>{t('집계 전 (서버 연결 후)')}</dd>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PaidApply() {
  const { state, dispatch, lang } = useStore();
  const { requireLogin } = useApp();
  const t = useT();
  const ops = state.ops;
  const subs = state.demoPaidEligible ? ops.paidEligibleSubs : 0;
  const ok = subsOk(subs, ops);
  const last = state.paidApplications[0];
  const [checks, setChecks] = useState({ normalHistory: false, rightsConfirmed: false, abnormalSubs: false, payoutInfo: false });
  const all = Object.values(checks).every(Boolean);
  return (
    <div className="screen">
      <BackBar title={t('유료화 신청')} />
      <div className="card">
        <p>
          {t('무료 구독자')} <strong>{t('{n}명', { n: ops.paidEligibleSubs })}</strong> {t('이상이면 신청할 수 있어요.')} {t('{n}명은', { n: ops.paidEligibleSubs })} <strong>{t('신청 조건')}</strong>
          {t('이지 자동 승인 조건이 아니에요. 정상 게시 이력, 권리 확인, 비정상 구독자 점검, 정산 정보 확인을 거쳐 운영팀이 심사해요.')}
        </p>
        <p className="small muted">{t('수치는 초기 제안이며 운영 설정에서 바꿀 수 있어요. 유료 작품은 {min} 이상, 미리듣기는 최대 {prev}.', { min: fmtDur(ops.paidMinSec, t), prev: fmtDur(ops.previewMaxSec, t) })}</p>
      </div>
      <dl className="kv">
        <dt>{t('내 구독자')}</dt>
        <dd>
          {t('{n}명', { n: subs })} {ok ? <Badge tone="good">{t('신청 가능')}</Badge> : <Badge>{t('{n}명 더 필요', { n: ops.paidEligibleSubs - subs })}</Badge>}
        </dd>
        <dt>{t('최근 신청')}</dt>
        <dd>{last ? `${paidStatusLabel(last.status, t)} · ${relTime(last.at, t, lang)}${last.note ? ` · ${last.note}` : ''}` : t('없음')}</dd>
      </dl>
      <Toggle id="demo-eligible" label={t('시연용: 구독자 조건을 충족한 상태로 보기')} checked={state.demoPaidEligible} onChange={(v) => dispatch({ type: 'setDemoPaidEligible', value: v })} />
      {ok && (!last || last.status === 'rejected') && (
        <>
          <SectionHead title={t('신청 전 확인')} />
          {[
            ['normalHistory', t('최근 90일간 제재 없이 정상적으로 게시했어요')],
            ['rightsConfirmed', t('유료로 팔 작품은 모두 내가 쓴 것이거나 권리를 확보했어요')],
            ['abnormalSubs', t('구독자를 구매하거나 봇으로 늘리지 않았어요')],
            ['payoutInfo', t('정산 정보(계좌·세무 정보)를 제출할 준비가 됐어요 (3단계에서 입력)')],
          ].map(([k, label]) => (
            <label key={k} className="check">
              <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} />
              <span>{label}</span>
            </label>
          ))}
          <Button variant="primary" size="lg" block disabled={!all} onClick={() => requireLogin(() => dispatch({ type: 'applyPaid', app: { id: uid('pa'), creatorId: 'me', at: new Date().toISOString(), status: 'submitted', checks } }))}>
            {t('유료화 심사 신청')}
          </Button>
          <p className="muted small">{t('신청 결과는 관리자 화면(데모)에서 승인·반려해 볼 수 있어요.')}</p>
        </>
      )}
      {last && last.status === 'approved' && (
        <div className="card card-good">
          <strong>{t('유료 판매가 승인됐어요')}</strong>
          <p className="small">{t('만들기에서 {min} 이상 작품을 유료로 올릴 수 있어요.', { min: fmtDur(ops.paidMinSec, t) })}</p>
        </div>
      )}
    </div>
  );
}

export function Notifications() {
  const { state, dispatch, lang } = useStore();
  const t = useT();
  useEffect(() => {
    const h = window.setTimeout(() => dispatch({ type: 'readNotices' }), 800);
    return () => window.clearTimeout(h);
  }, [dispatch]);
  return (
    <div className="screen">
      <BackBar title={t('알림')} />
      {state.notices.length === 0 ? (
        <Empty title={t('알림이 없어요')} desc={t('구독한 창작자의 새 작품, 생성 완료, 신고 처리 결과가 여기에 와요.')} />
      ) : (
        <div className="list">
          {state.notices.map((n) => (
            <div key={n.id} className="row">
              <span className="row-text">
                <span className="row-title">{t(n.text, n.params)}</span>
                <span className="row-sub">{relTime(n.at, t, lang)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LoginSheet({ open, onClose, onDone }) {
  const { dispatch } = useStore();
  const t = useT();
  const [name, setName] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title={t('로그인이 필요해요')}>
      <p>{t('듣기는 로그인 없이도 할 수 있어요. 구독·댓글·구매·만들기는 계정이 필요해요.')}</p>
      <label className="field">
        <span>{t('닉네임 (데모)')}</span>
        <input id="login-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('예: 밤산책러')} maxLength={12} />
      </label>
      <Button
        variant="primary"
        size="lg"
        block
        onClick={() => {
          dispatch({ type: 'login', name: name.trim() || undefined });
          onDone();
        }}
      >
        {t('데모 계정으로 계속')}
      </Button>
      <p className="muted small">{t('실제 인증(이메일·소셜 로그인)은 2단계에서 연결해요. 지금은 이 기기에만 저장돼요.')}</p>
    </Sheet>
  );
}

export function PurchaseSheet({ workId, onClose, onPlay }) {
  const { works, state, dispatch } = useStore();
  const t = useT();
  const [st, setSt] = useState('idle');
  const w = workId ? works.find((x) => x.id === workId) : undefined;
  if (!w) return null;
  const total = totalSec(w.sentences, state.ops.charsPerSec);
  const cut = previewCutoff(w.sentences, state.ops);
  const bought = isPurchased(w.id, state.purchases);
  return (
    <Sheet
      open={!!workId}
      onClose={() => {
        setSt('idle');
        onClose();
      }}
      title={t('전체 듣기')}
    >
      <h3 className="sheet-title">{w.title}</h3>
      {bought || st === 'done' ? (
        <>
          <div className="card card-good">
            <strong>{st === 'done' ? t('데모 구매가 완료됐어요') : t('이미 구매한 작품이에요')}</strong>
            <p className="small">
              {t('다시 결제하지 않고 그대로 이어 들을 수 있어요.')}
              {st === 'done' && ' ' + t('실제 결제는 일어나지 않았어요.')}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon="play"
            block
            onClick={() => {
              setSt('idle');
              onClose();
              onPlay(w.id);
            }}
          >
            {t('지금 듣기')}
          </Button>
        </>
      ) : (
        <>
          <dl className="kv">
            <dt>{t('전체 길이')}</dt>
            <dd>{fmtDur(total, t)}</dd>
            <dt>{t('미리듣기')}</dt>
            <dd>
              {fmtDur(cut, t)} ({t('무료')})
            </dd>
            <dt>{t('최종 가격')}</dt>
            <dd>
              <strong>{fmtKRW(w.priceKRW, t)}</strong> <span className="muted small">{t('(부가세 포함 여부·결제 수단별 가격은 3단계에서 확정)')}</span>
            </dd>
            <dt>{t('구매 범위')}</dt>
            <dd>{t('이 작품 1편 전체 (음성·자막·원문)')}</dd>
            <dt>{t('이용 기간')}</dt>
            <dd>{t('제한 없음 — 초기 제안')}</dd>
            <dt>{t('삭제·환불')}</dt>
            <dd className="small">{t('창작자가 작품을 삭제해도 구매자는 계속 들을 수 있게 유지(초기 제안). 중대한 음성 불량·미완결은 신고 후 환불 검토.')}</dd>
          </dl>
          <Button
            variant="warm"
            size="lg"
            block
            disabled={st === 'processing'}
            onClick={() => {
              setSt('processing');
              window.setTimeout(() => {
                dispatch({ type: 'purchase', work: w });
                setSt('done');
              }, 700);
            }}
          >
            {st === 'processing' ? t('처리 중…') : t('데모 결제 · {price}', { price: fmtKRW(w.priceKRW, t) })}
          </Button>
          <p className="muted small">
            <strong>{t('데모 결제')}</strong> {t('— 실제 돈이 나가지 않아요. 실제 결제(앱스토어·플레이·웹)는 3단계에서 서버 검증과 함께 붙이고, 스토어별 최소 가격 단위를 확인한 뒤 가격을 확정해요.')}
          </p>
        </>
      )}
    </Sheet>
  );
}

export const REPORT_REASONS = [
  { id: 'incomplete', label: '미완결인데 완결처럼 소개', forWork: true },
  { id: 'clickbait', label: '낚시성 소개', forWork: true },
  { id: 'audio_defect', label: '중대한 음성 불량', forWork: true },
  { id: 'privacy', label: '타인 개인정보 노출' },
  { id: 'harassment', label: '괴롭힘·혐오' },
  { id: 'copy', label: '무단 복제(다른 글·웹소설·대본)' },
  { id: 'impersonation', label: '사칭' },
  { id: 'rights', label: '권리 없는 음원·음성' },
  { id: 'illegal_promo', label: '불법 서비스 홍보' },
  { id: 'other', label: '기타' },
];

export function ReportSheet({ target, onClose }) {
  const { dispatch } = useStore();
  const t = useT();
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState('');
  const [sent, setSent] = useState(false);
  const close = () => {
    setReason(null);
    setDetail('');
    setSent(false);
    onClose();
  };
  const kind = target?.targetType === 'work' ? t('작품') : target?.targetType === 'comment' ? t('댓글') : t('사용자');
  return (
    <Sheet open={!!target} onClose={close} title={t('{kind} 신고', { kind })} tall>
      {sent ? (
        <>
          <div className="card card-good">
            <strong>{t('신고가 접수됐어요')}</strong>
            <p className="small">{t('운영팀이 검토한 뒤 조치 결과를 알림으로 알려 드려요. 조치에 이의가 있으면 알림에서 이의제기할 수 있어요.')}</p>
          </div>
          <Button variant="primary" block onClick={close}>
            {t('닫기')}
          </Button>
        </>
      ) : (
        <>
          <div className="radio-list">
            {REPORT_REASONS.filter((r) => !r.forWork || target?.targetType === 'work').map((r) => (
              <label key={r.id} className={`radio ${reason === r.id ? 'radio-on' : ''}`}>
                <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />
                <span>{t(r.label)}</span>
              </label>
            ))}
          </div>
          <label className="field">
            <span>{t('자세한 내용 (선택)')}</span>
            <textarea id="report-detail" value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} placeholder={t('어떤 부분이 문제인지 적어 주시면 검토가 빨라져요.')} />
          </label>
          <Button
            variant="danger"
            size="lg"
            block
            disabled={!reason}
            onClick={() => {
              if (target && reason) {
                dispatch({ type: 'report', targetType: target.targetType, targetId: target.targetId, reason, detail: detail.trim() || undefined });
                setSent(true);
              }
            }}
          >
            {t('신고 보내기')}
          </Button>
        </>
      )}
    </Sheet>
  );
}

export function Onboarding({ onDone }) {
  const { state, dispatch } = useStore();
  const t = useT();
  const [sel, setSel] = useState([]);
  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label={t('관심 장르 선택')}>
      <div className="onboard-card">
        <div className="onboard-logo">
          <Logo size={88} />
        </div>
        <div className="chip-row chip-wrap" aria-label={t('언어')}>
          {LANGS.map((l) => (
            <Chip key={l.id} active={state.prefs.lang === l.id} onClick={() => dispatch({ type: 'setPrefs', prefs: { lang: l.id } })}>
              {l.label}
            </Chip>
          ))}
        </div>
        <h1>{t('듣다가, 마음에 들면 구독하세요')}</h1>
        <p className="muted">{t('누구나 이야기를 올리고, 듣는 사람은 창작자를 무료로 구독해요. 관심 장르를 고르면 추천이 더 정확해져요. 건너뛰어도 괜찮아요.')}</p>
        <div className="chip-row chip-wrap">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={sel.includes(c.id)} onClick={() => setSel((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))}>
              {t(c.name)}
            </Chip>
          ))}
        </div>
        <div className="btn-row">
          <Button variant="ghost" onClick={() => onDone([])}>
            {t('건너뛰기')}
          </Button>
          <Button variant="primary" size="lg" onClick={() => onDone(sel)}>
            {sel.length ? t('{n}개 선택하고 시작', { n: sel.length }) : t('시작하기')}
          </Button>
        </div>
        <p className="small muted">{t('데모 버전 · 모든 작품과 수치는 시연용이에요')}</p>
      </div>
    </div>
  );
}
