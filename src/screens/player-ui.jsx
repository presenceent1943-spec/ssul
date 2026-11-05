import { useState } from 'react';
import { CAT } from '../data.js';
import { displayName, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, Button, Cover, CoverFill, Icon, Sheet, SubscribeButton, Toggle, WorkList } from '../ui.jsx';
import { clock } from '../util.js';
import { fmtDur, fmtKRW } from '../i18n.js';
import { VoicePicker } from './me.jsx';
import { voiceFor } from '../player.js';
import { PRESET } from '../speech.js';

const SPEEDS = [0.8, 1, 1.2, 1.5, 2];

export function MiniPlayer() {
  const { player, push } = useApp();
  const { creators } = useStore();
  const t = useT();
  const { ui, work, total, cutoff } = player;
  if (!work || ui.expanded) return null;
  const pct = Math.min(100, (ui.time / Math.max(total, 1)) * 100);
  return (
    <div className="mini" role="region" aria-label={t('재생 중')}>
      <div className="mini-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
        {cutoff < total && <span className="mini-cut" style={{ left: `${(cutoff / total) * 100}%` }} />}
      </div>
      <button type="button" className="mini-main" onClick={() => player.setExpanded(true)} aria-label={t('플레이어 열기')}>
        <Cover category={work.category} hue={work.hue} cover={work.cover} size={44} />
        <span className="mini-text">
          <span className="mini-title">{work.title}</span>
          <span className="mini-sub">
            {displayName(creators[work.creatorId], t)} · {work.voice === 'ai' ? t('AI 음성') : t('본인 목소리')}
            {ui.previewEnded ? ` · ${t('미리듣기 끝')}` : ''}
          </span>
        </span>
      </button>
      <button type="button" className={`play-pill ${ui.playing ? 'play-pill-on' : ''}`} onClick={player.toggle} aria-label={ui.playing ? t('일시정지') : t('재생')}>
        <Icon name={ui.playing ? 'pause' : 'play'} size={20} />
      </button>
      <button type="button" className="icon-btn" onClick={() => push({ kind: 'work', id: work.id })} aria-label={t('작품 상세')}>
        <Icon name="list" size={20} />
      </button>
    </div>
  );
}

export function FullPlayer() {
  const { player, openPurchase, requireLogin, share, openReport, push } = useApp();
  const { state, dispatch, creators, works } = useStore();
  const t = useT();
  const { ui, work, timeline, total, cutoff, access, sentenceIdx } = player;
  const [sleepOpen, setSleepOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  if (!work || !ui.expanded) return null;
  const creator = creators[work.creatorId];
  const liked = state.likes.includes(work.id);
  const saved = state.saves.includes(work.id);
  const nextC = player.nextCandidate();
  const others = works.filter((w) => w.creatorId === work.creatorId && w.id !== work.id).slice(0, 3);
  const pct = total ? (ui.time / total) * 100 : 0;
  const voiceOk = state.prefs.voiceOn && ui.voiceReady;
  const v = voiceFor(work, state.prefs);
  const voiceName = state.prefs.voiceMode === 'mine' ? (state.prefs.myVoice.startsWith('browser:') ? v.label : t(PRESET[state.prefs.myVoice]?.name ?? '')) : t(PRESET[work.aiVoiceName]?.name ?? '하늘');
  const sleepLabel = (s) => (s.kind === 'off' ? t('수면') : s.kind === 'end' ? t('끝나면') : t('{n}분', { n: Math.max(0, Math.ceil((s.endsAt - Date.now()) / 6e4)) }));
  return (
    <div className="player-backdrop" onClick={() => player.setExpanded(false)} role="presentation">
      <div className={`player player-${ui.mode}`} role="dialog" aria-label={t('플레이어')} onClick={(e) => e.stopPropagation()}>
        <div className="player-top">
          <button type="button" className="icon-btn" onClick={() => player.setExpanded(false)} aria-label={t('플레이어 접기')}>
            <Icon name="chevron-down" size={24} />
          </button>
          <div className="seg seg-small" role="tablist" aria-label={t('감상 방식')}>
            <button type="button" role="tab" aria-selected={ui.mode === 'audio'} className={ui.mode === 'audio' ? 'seg-on' : ''} onClick={() => player.setMode('audio')}>
              {t('오디오')}
            </button>
            <button type="button" role="tab" aria-selected={ui.mode === 'video'} className={ui.mode === 'video' ? 'seg-on' : ''} onClick={() => player.setMode('video')}>
              {t('자막 영상')}
            </button>
          </div>
          <button type="button" className="icon-btn" onClick={() => openReport('work', work.id)} aria-label={t('신고')}>
            <Icon name="flag" />
          </button>
        </div>
        {ui.mode === 'video' ? (
          <div className="stage stage-video">
            <CoverFill work={work} />
            <p className="stage-caption-big" aria-live="polite">
              {work.sentences[sentenceIdx]}
            </p>
            <p className="stage-caption-next">{work.sentences[sentenceIdx + 1] ?? ''}</p>
          </div>
        ) : (
          <div className="stage stage-audio">
            <Cover category={work.category} hue={work.hue} cover={work.cover} size={160} radius={24} label={work.episodeNo ? t('{n}화', { n: work.episodeNo }) : undefined} />
            <div className="captions" aria-live="polite">
              {work.sentences.map((s, i) => {
                const locked = !access && timeline[i] && timeline[i].start >= cutoff;
                if (Math.abs(i - sentenceIdx) > 2) return null;
                return (
                  <p key={i} className={`caption ${i === sentenceIdx ? 'caption-on' : ''} ${locked ? 'caption-locked' : ''}`}>
                    {locked ? `🔒 ${t('구매 후 들을 수 있어요')}` : s}
                  </p>
                );
              })}
            </div>
          </div>
        )}
        <div className="player-info">
          <h2 className="player-title">{work.title}</h2>
          <div className="player-creator">
            <button
              type="button"
              className="work-author"
              onClick={() => {
                player.setExpanded(false);
                push({ kind: 'creator', id: work.creatorId });
              }}
              aria-label={t('{name} 프로필', { name: displayName(creator, t) })}
            >
              {creator && <Avatar name={creator.name} hue={creator.hue} size={26} anon={creator.id === 'me' && creator.nameMode === 'anon'} />}
              {displayName(creator, t)}
            </button>
            <SubscribeButton creatorId={work.creatorId} size="sm" />
          </div>
          <p className="muted small">
            {t(CAT[work.category].name)} · {work.voice === 'ai' ? t('AI 음성') : t('본인 목소리')} · {voiceOk ? t('{name} 목소리로 재생 중(기기 음성)', { name: voiceName }) : state.prefs.voiceOn ? t('이 기기에 한국어 음성이 없어 자막만 재생돼요') : t('음성 꺼짐 · 자막만 재생')}
          </p>
        </div>
        <div className="scrub">
          <input id="scrub" type="range" min={0} max={Math.max(1, total)} step={1} value={Math.min(ui.time, total)} onChange={(e) => player.seek(Number(e.target.value))} aria-label={t('재생 위치')} aria-valuetext={`${clock(ui.time)} / ${clock(total)}`} style={{ '--pct': `${pct}%`, '--cut': `${total ? (cutoff / total) * 100 : 100}%` }} />
          <div className="scrub-times">
            <span>{clock(ui.time)}</span>
            {!access && <span className="warm-text">{t('미리듣기 {t}까지', { t: clock(cutoff) })}</span>}
            <span>{clock(total)}</span>
          </div>
        </div>
        <div className="controls">
          <button type="button" className="ctl" onClick={() => setSpeedOpen(true)} aria-label={t('배속 {n}배', { n: state.prefs.speed })}>
            <span className="ctl-text">{state.prefs.speed}×</span>
            <span className="ctl-label">{t('배속')}</span>
          </button>
          <button type="button" className="ctl" onClick={() => player.skip(-10)} aria-label={t('10초 뒤로')}>
            <Icon name="back10" size={30} />
            <span className="ctl-label">{t('10초')}</span>
          </button>
          <button type="button" className="ctl ctl-main" onClick={player.toggle} aria-label={ui.playing ? t('일시정지') : t('재생')}>
            <Icon name={ui.playing ? 'pause' : 'play'} size={34} />
          </button>
          <button type="button" className="ctl" onClick={() => player.skip(10)} aria-label={t('10초 앞으로')}>
            <Icon name="fwd10" size={30} />
            <span className="ctl-label">{t('10초')}</span>
          </button>
          <button type="button" className={`ctl ${ui.sleep.kind === 'off' ? '' : 'ctl-on'}`} onClick={() => setSleepOpen(true)} aria-label={t('수면 타이머')}>
            <Icon name="moon" size={26} />
            <span className="ctl-label">{sleepLabel(ui.sleep)}</span>
          </button>
        </div>
        <div className="action-row action-row-player">
          <button type="button" className={`action ${liked ? 'action-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleLike', workId: work.id }))} aria-pressed={liked}>
            <Icon name="heart" />
            <span>{t('좋아요')}</span>
          </button>
          <button type="button" className={`action ${saved ? 'action-on' : ''}`} onClick={() => requireLogin(() => dispatch({ type: 'toggleSave', workId: work.id }))} aria-pressed={saved}>
            <Icon name="bookmark" />
            <span>{t('저장')}</span>
          </button>
          <button type="button" className="action" onClick={() => share(work.id)}>
            <Icon name="share" />
            <span>{t('공유')}</span>
          </button>
          <button type="button" className={`action ${state.prefs.voiceMode === 'mine' ? 'action-on' : ''}`} onClick={() => setVoiceOpen(true)}>
            <Icon name="voice" />
            <span>{t('목소리')}</span>
          </button>
          <button
            type="button"
            className="action"
            onClick={() => {
              player.setExpanded(false);
              push({ kind: 'work', id: work.id });
            }}
          >
            <Icon name="comment" />
            <span>{t('댓글·원문')}</span>
          </button>
          <button type="button" className={`action ${state.prefs.voiceOn ? '' : 'action-on'}`} onClick={() => dispatch({ type: 'setPrefs', prefs: { voiceOn: !state.prefs.voiceOn } })} aria-pressed={!state.prefs.voiceOn}>
            <Icon name={state.prefs.voiceOn ? 'speaker' : 'speaker-off'} />
            <span>{state.prefs.voiceOn ? t('음성 끄기') : t('음성 켜기')}</span>
          </button>
        </div>
        {ui.previewEnded && (
          <div className="end-card end-card-paid">
            <h3>{t('미리듣기가 끝났어요')}</h3>
            <p className="small">
              {t('전체 {total} · 미리듣기 {cut} · 자동으로 결제되지 않아요.', { total: fmtDur(total, t), cut: fmtDur(cutoff, t) })}
            </p>
            <Button variant="warm" size="lg" icon="lock" block onClick={() => openPurchase(work.id)}>
              {t('전체 듣기 약 {price}', { price: fmtKRW(work.priceKRW, t) })}
            </Button>
            <Button
              size="lg"
              block
              onClick={() => {
                player.setExpanded(false);
                player.close();
                push({ kind: 'category', id: work.category });
              }}
            >
              {t('다른 이야기 듣기')}
            </Button>
          </div>
        )}
        {ui.ended && (
          <div className="end-card">
            <h3>{t('다 들었어요')}</h3>
            {nextC && (
              <Button variant={nextC.locked ? 'warm' : 'primary'} size="lg" icon={nextC.locked ? 'lock' : 'play'} block onClick={() => (nextC.locked ? openPurchase(nextC.work.id) : player.next())}>
                {nextC.work.episodeNo ? t('다음 화: {title}', { title: nextC.work.title }) : t('다음: {title}', { title: nextC.work.title })}
                {nextC.locked ? ` · ${fmtKRW(nextC.work.priceKRW, t)}` : ''}
              </Button>
            )}
            {work.creatorId !== 'me' && !state.subscriptions.includes(work.creatorId) && (
              <div className="end-sub">
                <span>{t('{name}의 새 이야기를 받아보려면', { name: displayName(creator, t) })}</span>
                <SubscribeButton creatorId={work.creatorId} size="sm" />
              </div>
            )}
            {others.length > 0 && (
              <>
                <p className="small muted">{t('{name}의 다른 작품', { name: displayName(creator, t) })}</p>
                <WorkList works={others} queue showCreator={false} />
              </>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                player.seek(0);
                player.play();
              }}
            >
              {t('처음부터 다시 듣기')}
            </Button>
          </div>
        )}
        {ui.queue.length > 0 && !ui.ended && (
          <p className="muted small center-text">
            {t('대기열 {n}편', { n: ui.queue.length })} · {state.prefs.autoplay ? t('끝나면 자동으로 이어져요') : t('끝나면 다음 이야기 버튼으로 이어 들을 수 있어요')}
          </p>
        )}

        <Sheet open={sleepOpen} onClose={() => setSleepOpen(false)} title={t('수면 타이머')}>
          <div className="choice-grid">
            {[10, 20, 30, 60].map((m) => (
              <Button
                key={m}
                variant={ui.sleep.kind === 'minutes' && ui.sleep.minutes === m ? 'primary' : 'secondary'}
                onClick={() => {
                  player.setSleep({ kind: 'minutes', minutes: m, endsAt: Date.now() + m * 6e4 });
                  setSleepOpen(false);
                }}
              >
                {t('{n}분', { n: m })}
              </Button>
            ))}
            <Button
              variant={ui.sleep.kind === 'end' ? 'primary' : 'secondary'}
              onClick={() => {
                player.setSleep({ kind: 'end' });
                setSleepOpen(false);
              }}
            >
              {t('이번 작품 끝나면')}
            </Button>
            <Button
              variant={ui.sleep.kind === 'off' ? 'primary' : 'secondary'}
              onClick={() => {
                player.setSleep({ kind: 'off' });
                setSleepOpen(false);
              }}
            >
              {t('끄기')}
            </Button>
          </div>
          <p className="muted small">{t('종료 1분 전부터 음량이 서서히 작아져요. 타이머가 켜져 있어도 유료 작품을 자동 구매하지 않아요.')}</p>
          <Toggle id="sleep-safe" label={t('수면 추천에서 큰 효과음·강한 공포 제외')} checked={state.prefs.sleepSafe} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { sleepSafe: v } })} />
        </Sheet>

        <Sheet open={speedOpen} onClose={() => setSpeedOpen(false)} title={t('재생 속도')}>
          <div className="choice-grid">
            {SPEEDS.map((s) => (
              <Button
                key={s}
                variant={state.prefs.speed === s ? 'primary' : 'secondary'}
                onClick={() => {
                  player.setSpeed(s);
                  setSpeedOpen(false);
                }}
              >
                {s}×
              </Button>
            ))}
          </div>
          <Toggle id="autoplay" label={t('끝나면 다음 작품 자동 재생')} checked={state.prefs.autoplay} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { autoplay: v } })} />
          <Toggle id="datasaver" label={t('데이터 절약(오디오만)')} checked={state.prefs.dataSaver} onChange={(v) => dispatch({ type: 'setPrefs', prefs: { dataSaver: v } })} />
          <p className="muted small">{t('화면을 끄고 듣기·잠금화면 제어는 웹에서 브라우저마다 지원이 달라요. 네이티브 앱(4단계)에서 보장합니다.')}</p>
        </Sheet>

        <Sheet open={voiceOpen} onClose={() => setVoiceOpen(false)} title={t('목소리 바꾸기')} tall>
          <VoicePicker />
        </Sheet>
      </div>
    </div>
  );
}
