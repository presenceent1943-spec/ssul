import { useState } from 'react';
import { useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { BackBar, Badge, Button, Empty } from '../ui.jsx';
import { DEFAULT_OPS } from '../store.jsx';
import { RANK_W, expectedCompletion } from '../util.js';
import { fmtCount, relTime } from '../i18n.js';
import { paidStatusLabel } from './me.jsx';

const REASON = {
  incomplete: '미완결',
  clickbait: '낚시성 소개',
  audio_defect: '음성 불량',
  privacy: '개인정보',
  harassment: '괴롭힘',
  copy: '무단 복제',
  impersonation: '사칭',
  rights: '권리 없는 음원',
  illegal_promo: '불법 홍보',
  other: '기타',
};

export function Admin() {
  const { state, dispatch, works, comments, lang } = useStore();
  const { toast } = useApp();
  const t = useT();
  const [tab, setTab] = useState('reports');
  const ops = state.ops;
  const setOps = (o) => dispatch({ type: 'setOps', ops: o });
  const field = (k, label, step = 1) => (
    <label key={k} className="field field-inline">
      <span>{label}</span>
      <input id={`ops-${k}`} type="number" value={ops[k]} step={step} min={0} onChange={(e) => setOps({ [k]: Number(e.target.value) })} />
    </label>
  );
  const targetLabel = (r) =>
    r.targetType === 'work'
      ? t('작품 「{title}」', { title: works.find((w) => w.id === r.targetId)?.title ?? r.targetId })
      : r.targetType === 'comment'
      ? t('댓글 "{text}"', { text: comments.find((c) => c.id === r.targetId)?.text.slice(0, 30) ?? r.targetId })
      : t('사용자 {id}', { id: r.targetId });
  return (
    <div className="screen">
      <BackBar title={t('관리자 (데모)')} />
      <p className="muted small">{t('실제 서비스에서는 관리자 권한이 있는 계정만 들어올 수 있어요. 지금은 흐름 확인용으로 열어 두었어요.')}</p>
      <div className="seg" role="tablist">
        {['reports', 'paid', 'ops'].map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'seg-on' : ''} onClick={() => setTab(k)}>
            {k === 'reports' ? t('신고 {n}', { n: state.reports.filter((r) => r.status === 'open').length }) : k === 'paid' ? t('유료화 심사 {n}', { n: state.paidApplications.filter((p) => p.status === 'submitted').length }) : t('운영 설정')}
          </button>
        ))}
      </div>
      {tab === 'reports' &&
        (state.reports.length === 0 ? (
          <Empty title={t('접수된 신고가 없어요')} desc={t('작품·댓글·사용자 신고가 여기에 모여요.')} />
        ) : (
          <div className="list">
            {state.reports.map((r) => (
              <div key={r.id} className="stat-card">
                <div className="row-between">
                  <strong>{t(REASON[r.reason])}</strong>
                  <Badge tone={r.status === 'open' ? 'warm' : r.status === 'actioned' ? 'danger' : 'neutral'}>{r.status === 'open' ? t('대기') : r.status === 'actioned' ? t('조치됨') : t('기각')}</Badge>
                </div>
                <p className="small">{targetLabel(r)}</p>
                {r.detail && <p className="small muted">"{r.detail}"</p>}
                <p className="small muted">{relTime(r.at, t, lang)}</p>
                {r.status === 'open' ? (
                  <div className="btn-row">
                    <Button size="sm" onClick={() => dispatch({ type: 'actOnReport', reportId: r.id, kind: 'warn', note: t('작성자에게 경고') })}>
                      {t('경고')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'actOnReport', reportId: r.id, kind: 'hide', note: t('콘텐츠 숨김') })}>
                      {t('숨김')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'actOnReport', reportId: r.id, kind: 'dismiss', note: t('위반 아님') })}>
                      {t('기각')}
                    </Button>
                  </div>
                ) : (
                  <p className="small">
                    {t('조치 기록')}: {r.action?.note} · {r.action && relTime(r.action.at, t, lang)} · {t('이의제기 가능(2단계)')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      {tab === 'paid' &&
        (state.paidApplications.length === 0 ? (
          <Empty title={t('심사할 신청이 없어요')} />
        ) : (
          <div className="list">
            {state.paidApplications.map((p) => (
              <div key={p.id} className="stat-card">
                <div className="row-between">
                  <strong>{p.creatorId === 'me' ? state.me.name : p.creatorId}</strong>
                  <Badge tone={p.status === 'approved' ? 'good' : p.status === 'rejected' ? 'danger' : 'warm'}>{paidStatusLabel(p.status, t)}</Badge>
                </div>
                <p className="small muted">
                  {relTime(p.at, t, lang)} · {t('체크 {n}/4', { n: Object.values(p.checks).filter(Boolean).length })}
                </p>
                {p.status === 'submitted' && (
                  <div className="btn-row">
                    <Button size="sm" variant="primary" onClick={() => dispatch({ type: 'decidePaid', id: p.id, status: 'approved', note: t('심사 통과') })}>
                      {t('승인')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => dispatch({ type: 'decidePaid', id: p.id, status: 'rejected', note: t('권리 확인 자료 부족') })}>
                      {t('반려')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      {tab === 'ops' && (
        <>
          <p className="small muted">{t('모두 초기 제안값이에요. 바꾸면 앱 전체(미리듣기 길이, 태그 수, 순위 등)에 바로 반영돼요.')}</p>
          {field('maxTags', t('태그 최대 개수'))}
          {field('paidMinSec', t('유료 최소 길이(초)'), 10)}
          {field('previewMaxSec', t('미리듣기 최대 길이(초)'), 5)}
          {field('shortMaxSec', t('짧은 콘텐츠 기준(초)'), 5)}
          {field('paidEligibleSubs', t('유료화 신청 구독자 수'))}
          {field('unitPriceKRW', t('작품 단가(원)'), 100)}
          {field('charsPerSec', t('길이 추정 글자/초'), 0.5)}
          {field('rankingShrinkM', t('순위 완청률 수축 m'))}
          {field('dailyGenerationLimit', t('하루 생성 한도'))}
          {field('maxRetries', t('실패 재시도 한도'))}
          <label className="field">
            <span>{t('AI 대본 정리 서버 주소')}</span>
            <input id="ops-tidyUrl" type="url" value={ops.tidyUrl ?? ''} placeholder="https://ssul-tidy.xxxx.workers.dev" onChange={(e) => setOps({ tidyUrl: e.target.value.trim() })} />
          </label>
          <p className="small muted">{t('비워 두면 기본 정리(문장 끊기·군더더기 제거)만 해요. Cloudflare Worker 주소를 넣으면 AI가 흐름과 의도를 읽어 대본으로 고쳐 써요. (worker/tidy-worker.js)')}</p>
          <div className="card card-soft small">
            <strong>{t('순위 가중치(초기 제안)')}</strong>
            <p>
              {t('유효 청취 {a} · 완청률 {b} · 저장+공유 {c} · 좋아요 {d}. 완청률은 (완청 + m×0.5)/(유효 청취 + m)으로 수축하고, 길이별 기대 완청률(30초 {e}, 3분 {f}, 10분 {g})로 나눠 길이 편향을 보정해요.', {
                a: RANK_W.listens,
                b: RANK_W.completion,
                c: RANK_W.saveShare,
                d: RANK_W.likes,
                e: expectedCompletion(30).toFixed(2),
                f: expectedCompletion(180).toFixed(2),
                g: expectedCompletion(600).toFixed(2),
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              dispatch({ type: 'setOps', ops: { ...DEFAULT_OPS } });
              toast(t('초기 제안값으로 되돌렸어요'));
            }}
          >
            {t('초기값으로')}
          </Button>
          <p className="small muted">{t('손익 예시(가정): 300원 작품 1건 결제 시 스토어 수수료 30% 가정 → 90원, PG 웹 결제 3% 가정 → 9원. 플랫폼:창작자 비율은 미정이며, AI 생성·저장·전송 비용을 더해 3단계에서 확정해요.')}</p>
        </>
      )}
      <p className="small muted">
        {t('현재 {n}편 게시', { n: fmtCount(works.length, lang) })} · {t('차단 {n}명', { n: state.blocked.length })}
      </p>
    </div>
  );
}
