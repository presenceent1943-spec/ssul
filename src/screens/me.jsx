import { useEffect, useState } from 'react';
import { displayName, subscriberCount, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, BackBar, Button, Chip, Empty, Icon, Row, SectionHead, Toggle, WorkGrid } from '../ui.jsx';
import { LANGS } from '../i18n.js';
import { VOICE_PRESETS, allVoices, onVoicesReady } from '../speech.js';
import { VoiceSample } from './create.jsx';
import { coverStyle } from '../ui.jsx';
import { profileCover } from './creator.jsx';

export function paidStatusLabel(s, t) {
  return s === 'submitted' ? t('접수') : s === 'reviewing' ? t('심사 중') : s === 'approved' ? t('승인') : t('반려');
}

export function MyPage() {
  const { state, dispatch, works, creators, lang } = useStore();
  const { push, requireLogin } = useApp();
  const t = useT();
  const me = creators.me;
  const mine = works.filter((w) => w.creatorId === 'me');
  const unread = state.notices.filter((n) => !n.read).length;
  if (!state.loggedIn)
    return (
      <div className="screen">
        <header className="topbar">
          <h1 className="page-title">{t('내 정보')}</h1>
        </header>
        <Empty
          title={t('로그인하면 더 많은 걸 할 수 있어요')}
          desc={t('듣기는 지금도 되지만, 구독·댓글·만들기·구매에는 계정이 필요해요.')}
          action={
            <Button variant="primary" size="lg" onClick={() => requireLogin(() => {})}>
              {t('데모 계정으로 로그인')}
            </Button>
          }
        />
        <div className="list">
          <Row label={t('설정')} sub={t('언어·다크 모드·큰 글씨·목소리')} onClick={() => push({ kind: 'settings' })} icon="settings" />
          <Row label={t('관리자 화면 (데모)')} onClick={() => push({ kind: 'admin' })} />
        </div>
      </div>
    );
  return (
    <div className="screen">
      <header className="topbar">
        <h1 className="page-title">{t('내 정보')}</h1>
        <button type="button" className="icon-btn" aria-label={t('알림')} onClick={() => push({ kind: 'notifications' })}>
          <Icon name="bell" />
          {unread > 0 && <span className="dot" aria-hidden="true" />}
        </button>
      </header>
      <button type="button" className="profile-row profile-row-banner" onClick={() => push({ kind: 'creator', id: 'me' })} style={coverStyle(profileCover(me), me.hue)}>
        <span className="profile-row-inner">
          <Avatar name={me.name} hue={me.hue} size={56} anon={me.nameMode === 'anon'} />
          <span className="row-text">
            <span className="row-title">{displayName(me, t)}</span>
            <span className="row-sub">
              {me.nameMode === 'name' ? `@${me.handle} · ` : ''}
              {t('구독자 {n}', { n: subscriberCount(me, state) })} · {t('구독 중 {n}', { n: state.subscriptions.length })}
            </span>
          </span>
          <Icon name="chevron-right" />
        </span>
      </button>
      <div className="btn-row">
        <Button icon="palette" onClick={() => push({ kind: 'customize' })}>
          {t('내 피드 꾸미기')}
        </Button>
        <Button variant="ghost" icon="voice" onClick={() => push({ kind: 'settings', section: 'voice' })}>
          {t('목소리')}
        </Button>
      </div>
      <SectionHead
        title={t('내 작품 {n}편', { n: mine.length })}
        action={
          <Button size="sm" variant="ghost" onClick={() => push({ kind: 'stats' })}>
            {t('통계')}
          </Button>
        }
      />
      <WorkGrid works={mine} emptyText={t('아직 게시한 작품이 없어요. 만들기에서 첫 이야기를 올려 보세요.')} />
      <div className="list">
        <Row label={t('창작자 통계')} sub={t('유효 청취·완청률·구독 전환')} onClick={() => push({ kind: 'stats' })} />
        <Row label={t('유료화 신청')} sub={state.paidApplications[0] ? t('상태: {s}', { s: paidStatusLabel(state.paidApplications[0].status, t) }) : t('구독자 {n}명 이상이면 신청 가능', { n: state.ops.paidEligibleSubs })} onClick={() => push({ kind: 'paid-apply' })} />
        <Row label={t('구매 내역')} onClick={() => push({ kind: 'purchases' })} />
        <Row label={t('설정')} sub={t('언어·다크 모드·큰 글씨·목소리·재생')} onClick={() => push({ kind: 'settings' })} />
        <Row label={t('관리자 화면 (데모)')} sub={t('신고 처리·유료화 심사·운영 설정')} onClick={() => push({ kind: 'admin' })} />
        <Row label={t('로그아웃')} onClick={() => dispatch({ type: 'logout' })} />
      </div>
    </div>
  );
}

// 목소리 고르기 (설정·플레이어 공용)
export function VoicePicker({ compact }) {
  const { state, dispatch, lang } = useStore();
  const t = useT();
  const [voices, setVoices] = useState([]);
  useEffect(() => onVoicesReady(() => setVoices(allVoices())), []);
  const p = state.prefs;
  const set = (prefs) => dispatch({ type: 'setPrefs', prefs });
  const sample = t('안녕하세요. 오늘은 어떤 이야기를 들려 드릴까요?');
  const kor = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  const list = kor.length ? kor : voices;
  return (
    <div className="voice-picker">
      <div className="seg seg-wide" role="tablist" aria-label={t('목소리 기준')}>
        <button type="button" role="tab" aria-selected={p.voiceMode === 'creator'} className={p.voiceMode === 'creator' ? 'seg-on' : ''} onClick={() => set({ voiceMode: 'creator' })}>
          {t('작가가 고른 목소리')}
        </button>
        <button type="button" role="tab" aria-selected={p.voiceMode === 'mine'} className={p.voiceMode === 'mine' ? 'seg-on' : ''} onClick={() => set({ voiceMode: 'mine' })}>
          {t('내가 고른 목소리')}
        </button>
      </div>
      {p.voiceMode === 'mine' && (
        <>
          <p className="small muted">{t('모든 이야기를 아래에서 고른 목소리로 들어요. 각각 들어보고 편한 걸로 고르세요.')}</p>
          <div className="radio-list">
            {VOICE_PRESETS.map((v) => (
              <label key={v.id} className={`radio radio-voice ${p.myVoice === v.id ? 'radio-on' : ''}`}>
                <input type="radio" name="myVoice" checked={p.myVoice === v.id} onChange={() => set({ myVoice: v.id })} />
                <span>
                  <strong>{t(v.name)}</strong> <span className="small muted">— {t(v.desc)}</span>
                </span>
                <VoiceSample text={sample} choice={v.id} lang={lang} />
              </label>
            ))}
          </div>
          {!compact && (
            <>
              <p className="label">
                {t('이 기기에 설치된 음성')} <span className="muted small">{t('기기·브라우저마다 달라요. 더 자연스러운 음성이 있으면 직접 골라 보세요.')}</span>
              </p>
              {list.length === 0 ? (
                <p className="muted small">{t('아직 음성 목록을 불러오지 못했어요. 잠시 후 다시 열어 보세요.')}</p>
              ) : (
                <div className="radio-list">
                  {list.map((v) => {
                    const id = `browser:${v.voiceURI}`;
                    return (
                      <label key={v.voiceURI} className={`radio radio-voice ${p.myVoice === id ? 'radio-on' : ''}`}>
                        <input type="radio" name="myVoice" checked={p.myVoice === id} onChange={() => set({ myVoice: id })} />
                        <span>
                          <strong>{v.name}</strong> <span className="small muted">— {v.lang}{v.localService ? '' : ` · ${t('온라인')}`}</span>
                        </span>
                        <VoiceSample text={sample} choice={id} lang={lang} />
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
      {p.voiceMode === 'creator' && <p className="small muted">{t('작품마다 작가가 고른 목소리(하늘·바다·숲 등)로 들어요. 듣기 싫은 목소리가 있으면 ‘내가 고른 목소리’로 바꾸세요.')}</p>}
      <label className="field">
        <span>
          {t('목소리 높낮이')} <span className="muted">· {t('낮게')} ← {Math.round((p.pitchAdj ?? 1) * 100)}% → {t('높게')}</span>
        </span>
        <input type="range" min={0.6} max={1.5} step={0.05} value={p.pitchAdj ?? 1} onChange={(e) => set({ pitchAdj: Number(e.target.value) })} aria-label={t('목소리 높낮이')} />
      </label>
      <div className="chip-row">
        {[0.8, 1, 1.2, 1.5].map((s) => (
          <Chip key={s} active={p.speed === s} onClick={() => set({ speed: s })}>
            {s}×
          </Chip>
        ))}
        <Chip onClick={() => set({ pitchAdj: 1, speed: 1 })}>{t('기본으로')}</Chip>
      </div>
      <p className="muted small">{t('지금은 기기 내장 음성(TTS)이라 딱딱하게 들릴 수 있어요. 실제 서비스에서는 서버에서 만든 자연스러운 음성 파일로 바뀌어요.')}</p>
    </div>
  );
}

export function Settings({ section }) {
  const { state, dispatch } = useStore();
  const { toast } = useApp();
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  const p = state.prefs;
  const set = (prefs) => dispatch({ type: 'setPrefs', prefs });
  useEffect(() => {
    if (section === 'voice') document.getElementById('voice-section')?.scrollIntoView({ block: 'start' });
  }, [section]);
  return (
    <div className="screen">
      <BackBar title={t('설정')} />

      <SectionHead title={t('언어')} />
      <div className="chip-row chip-wrap">
        {LANGS.map((l) => (
          <Chip key={l.id} active={p.lang === l.id} onClick={() => set({ lang: l.id })}>
            <Icon name="globe" size={14} /> {l.label}
          </Chip>
        ))}
      </div>
      <p className="muted small">{t('메뉴와 안내 문구가 바뀌어요. 작품 내용은 작가가 쓴 언어 그대로예요.')}</p>

      <SectionHead title={t('화면')} />
      <div className="seg seg-wide" role="tablist" aria-label={t('화면 모드')}>
        {[
          ['system', t('기기 설정 따르기')],
          ['light', t('밝게')],
          ['dark', t('어둡게')],
        ].map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={p.theme === v} className={p.theme === v ? 'seg-on' : ''} onClick={() => set({ theme: v })}>
            {label}
          </button>
        ))}
      </div>
      <Toggle id="big-text" label={t('큰 글씨')} checked={p.bigText} onChange={(v) => set({ bigText: v })} />
      <Toggle id="easy-mode" label={t('쉬운 화면 (큰 버튼, 글자 라벨 강조)')} checked={p.easyMode} onChange={(v) => set({ easyMode: v })} />
      <p className="muted small">{t('화면 읽기(스크린리더)는 모든 버튼에 글자 라벨이 있어 그대로 동작해요.')}</p>

      <div id="voice-section" />
      <SectionHead title={t('목소리')} sub={t('듣는 목소리를 바꿀 수 있어요')} />
      <Toggle id="voice-on" label={t('AI 음성 재생 (끄면 자막만)')} checked={p.voiceOn} onChange={(v) => set({ voiceOn: v })} />
      <VoicePicker />

      <SectionHead title={t('재생')} />
      <Toggle id="autoplay2" label={t('끝나면 다음 작품 자동 재생')} checked={p.autoplay} onChange={(v) => set({ autoplay: v })} />
      <Toggle id="datasaver2" label={t('데이터 절약 (오디오만, 자막 영상 끔)')} checked={p.dataSaver} onChange={(v) => set({ dataSaver: v })} />
      <Toggle id="sleepsafe2" label={t('수면 추천에서 강한 공포·큰 효과음 제외')} checked={p.sleepSafe} onChange={(v) => set({ sleepSafe: v })} />

      {state.loggedIn && (
        <>
          <SectionHead title={t('프로필')} />
          <p className="muted small">{t('이름·배경·이름 표시 방식은 ‘내 피드 꾸미기’에서 바꿔요.')}</p>
        </>
      )}

      <SectionHead title={t('데이터')} />
      <p className="muted small">{t('이 시연 버전의 모든 데이터(구독·구매·초안·내 작품)는 이 브라우저에만 저장돼요. 다른 기기와 공유되지 않아요.')}</p>
      {confirm ? (
        <div className="card card-warn">
          <strong>{t('정말 모두 지울까요?')}</strong>
          <p className="small">{t('구독, 구매 기록, 초안, 내 작품이 모두 사라져요.')}</p>
          <div className="btn-row">
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'reset' });
                setConfirm(false);
                toast(t('처음 상태로 돌아갔어요'));
              }}
            >
              {t('지우기')}
            </Button>
            <Button onClick={() => setConfirm(false)}>{t('취소')}</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirm(true)}>
          {t('데모 데이터 초기화')}
        </Button>
      )}
    </div>
  );
}
