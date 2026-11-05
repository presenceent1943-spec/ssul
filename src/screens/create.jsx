import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT, CATEGORIES } from '../data.js';
import { useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Badge, Button, Chip, Cover, Icon, SectionHead, Toggle } from '../ui.jsx';
import { autoTitle, cleanScript, emptyStats, findPII, guessCategory, normTag, paidLengthOk, sentenceSec, splitSentences, subsOk, suggestTags, uid } from '../util.js';
import { fmtDur, fmtKRW, LOCALE } from '../i18n.js';
import { PRESET, VOICE_PRESETS, resolveVoice, speak, stopSpeech } from '../speech.js';
import { CoverPicker } from './creator.jsx';

const STEPS = ['쓰기', '대본', '목소리', '미리 듣기', '게시'];
const STATUS = { draft: '초안', script_review: '대본 확인', queued: '생성 대기', generating: '생성 중', review: '검토 대기', published: '게시', failed: '실패' };

function newDraft() {
  return { id: uid('d'), rawText: '', tags: [], origin: 'true', voice: 'ai', aiVoiceName: 'haneul', paid: false, status: 'draft', retries: 0, updatedAt: new Date().toISOString() };
}

export function VoiceSample({ text, choice, lang = 'ko', size = 'sm' }) {
  const t = useT();
  const { toast } = useApp();
  const [on, setOn] = useState(false);
  useEffect(() => () => on && stopSpeech(), [on]);
  const play = () => {
    if (on) {
      stopSpeech();
      setOn(false);
      return;
    }
    const v = resolveVoice(choice, lang);
    const ok = speak(text, { lang: LOCALE[lang] ?? 'ko-KR', rate: v.rate, pitch: v.pitch, volume: v.volume, voice: v.voice, onEnd: () => setOn(false), onError: () => setOn(false) });
    if (!ok) toast(t('이 기기에서는 음성 샘플을 재생할 수 없어요.'));
    else setOn(true);
  };
  return (
    <Button size={size} variant={on ? 'primary' : 'secondary'} icon={on ? 'pause' : 'play'} onClick={play} aria-pressed={on}>
      {on ? t('멈추기') : t('들어보기')}
    </Button>
  );
}

export function Create({ draftId, onDone }) {
  const { state, dispatch } = useStore();
  const { requireLogin, toast, push } = useApp();
  const t = useT();
  const existing = draftId ? state.drafts.find((d) => d.id === draftId) : undefined;
  const [d, setD] = useState(() => existing ?? newDraft());
  const [step, setStep] = useState(existing ? 1 : 0);
  const [mode, setMode] = useState('write');
  const [listening, setListening] = useState(false);
  const [micNote, setMicNote] = useState(null);
  const [interim, setInterim] = useState('');
  const [forceFail, setForceFail] = useState(false);
  const [gen, setGen] = useState(null);
  const [checks, setChecks] = useState({ rights: false, privacy: false });
  const [tagInput, setTagInput] = useState('');
  const [lineOn, setLineOn] = useState(-1);
  const timers = useRef([]);
  const ops = state.ops;
  const patch = (p) => setD((x) => ({ ...x, ...p, updatedAt: new Date().toISOString() }));

  useEffect(() => {
    if (!d.rawText.trim() && !d.title) return;
    const h = window.setTimeout(() => dispatch({ type: 'saveDraft', draft: d }), 600);
    return () => window.clearTimeout(h);
  }, [d, dispatch]);
  useEffect(
    () => () => {
      timers.current.forEach((h) => window.clearTimeout(h));
      stopSpeech();
    },
    []
  );

  const script = d.approvedScript ?? d.cleanedText ?? d.rawText;
  const sentences = useMemo(() => splitSentences(script), [script]);
  const sec = useMemo(() => sentences.reduce((a, s) => a + sentenceSec(s, ops.charsPerSec), 0), [sentences, ops.charsPerSec]);
  const guessed = useMemo(() => guessCategory(d.rawText), [d.rawText]);
  const cat = d.category ?? guessed;
  const tagSug = useMemo(() => suggestTags(d.rawText, sec, ops.shortMaxSec, ops.maxTags), [d.rawText, sec, ops.shortMaxSec, ops.maxTags]);
  const pii = useMemo(() => findPII(script), [script]);
  const left = Math.max(0, ops.dailyGenerationLimit - state.generationsToday);
  const mySubs = state.demoPaidEligible ? ops.paidEligibleSubs : 0;
  const approved = state.paidApplications.some((p) => p.status === 'approved');
  const paidOk = approved && subsOk(mySubs, ops) && paidLengthOk({ sentences }, ops);
  const title = d.title?.trim() || autoTitle(script) || t('제목 없는 이야기');
  const voiceLabel = d.voice === 'own' ? t('내 목소리(2단계)') : t('AI 음성 · {name}', { name: t(PRESET[d.aiVoiceName]?.name ?? '') });
  const recRef = useRef(null);

  // 음성인식: 아이폰(iOS)은 continuous 모드가 자주 멈추므로 짧은 세션을 자동으로 이어 붙이고,
  // 응답이 없으면 감시 타이머가 끊어 준다. 말하는 중에는 임시 글자를 바로 보여 준다.
  const wantRef = useRef(false);
  const baseRef = useRef('');
  const finalRef = useRef('');
  const watchRef = useRef(0);
  const stopMic = () => {
    wantRef.current = false;
    window.clearTimeout(watchRef.current);
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
    setListening(false);
    setInterim('');
  };
  const startSession = () => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = LOCALE[state.prefs.lang] ?? 'ko-KR';
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    let gotAny = false;
    const arm = (ms) => {
      window.clearTimeout(watchRef.current);
      watchRef.current = window.setTimeout(() => {
        // 응답 없음: 세션을 끊고 (듣는 중이면) 새로 시작
        try {
          r.abort();
        } catch {}
        if (wantRef.current) {
          if (!gotAny) {
            wantRef.current = false;
            setListening(false);
            setInterim('');
            setMicNote(t('마이크 응답이 없어요. 앱을 완전히 닫았다가 다시 열거나, 사파리에서 열어 다시 시도해 주세요.'));
          } else startSession();
        }
      }, ms);
    };
    r.onstart = () => arm(8000);
    r.onaudiostart = () => {
      gotAny = true;
      arm(15000);
    };
    r.onresult = (e) => {
      gotAny = true;
      arm(15000);
      let fin = '';
      let tmp = '';
      for (let i = 0; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += tr + ' ';
        else tmp += tr;
      }
      if (fin) {
        finalRef.current = (finalRef.current + ' ' + fin).trim();
        patch({ rawText: (baseRef.current + ' ' + finalRef.current).trim(), cleanedText: undefined, approvedScript: undefined });
      }
      setInterim(tmp);
    };
    r.onerror = (e) => {
      window.clearTimeout(watchRef.current);
      const code = e?.error;
      if (code === 'no-speech' || code === 'aborted') return; // onend에서 이어감
      wantRef.current = false;
      setListening(false);
      setInterim('');
      setMicNote(code === 'not-allowed' || code === 'service-not-allowed' ? t('마이크 권한이 꺼져 있어요. 설정 → 앱 → 마이크 허용 후 다시 시도해 주세요.') : t('마이크를 쓸 수 없어요. 앱 미리보기 환경에서는 마이크가 막혀 있을 수 있어요. 일반 브라우저 탭이나 설치형 앱에서 다시 시도해 주세요.'));
    };
    r.onend = () => {
      window.clearTimeout(watchRef.current);
      setInterim('');
      if (wantRef.current) window.setTimeout(() => wantRef.current && startSession(), 150);
      else setListening(false);
    };
    recRef.current = r;
    r.start();
  };
  const toggleMic = () => {
    if (listening) {
      stopMic();
      return;
    }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setMicNote(t('이 브라우저는 음성인식을 지원하지 않아요. 글로 적어 주세요. (2단계에서 서버 음성인식으로 대체)'));
      return;
    }
    try {
      baseRef.current = d.rawText.trim();
      finalRef.current = '';
      wantRef.current = true;
      setMicNote(null);
      setListening(true);
      startSession();
    } catch {
      wantRef.current = false;
      setListening(false);
      setMicNote(t('마이크를 시작하지 못했어요. 글로 적어 주세요.'));
    }
  };
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && wantRef.current) stopMic();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      wantRef.current = false;
      window.clearTimeout(watchRef.current);
      try {
        recRef.current?.abort();
      } catch {}
    };
  }, []); // eslint-disable-line

  const previewLines = () => {
    const lines = sentences.slice(0, 2);
    if (!lines.length) return;
    const v = resolveVoice(d.aiVoiceName, state.prefs.lang);
    const run = (i) => {
      if (i >= lines.length) {
        setLineOn(-1);
        return;
      }
      setLineOn(i);
      const ok = speak(lines[i], {
        lang: LOCALE[state.prefs.lang] ?? 'ko-KR',
        rate: v.rate,
        pitch: v.pitch,
        volume: v.volume,
        voice: v.voice,
        onEnd: () => run(i + 1),
        onError: () => {
          setLineOn(-1);
          toast(t('이 기기에서는 음성 샘플을 재생할 수 없어요. 자막만 확인해 주세요.'));
        },
      });
      if (!ok) {
        setLineOn(-1);
        toast(t('이 기기에서는 음성 샘플을 재생할 수 없어요. 자막만 확인해 주세요.'));
      }
    };
    run(0);
  };

  const generate = (fail) => {
    if (left <= 0) {
      toast(t('오늘 생성 한도({n}회)를 다 썼어요. 내일 다시 시도해 주세요.', { n: ops.dailyGenerationLimit }));
      return;
    }
    dispatch({ type: 'useGeneration' });
    timers.current.forEach((h) => window.clearTimeout(h));
    timers.current = [];
    setGen('queued');
    const h1 = window.setTimeout(() => setGen('generating'), 700);
    const h2 = window.setTimeout(() => {
      if (fail && d.retries < ops.maxRetries) {
        setGen('failed');
        patch({ status: 'failed', failReason: t('음성 생성 서버 응답 없음(시연용 강제 실패)'), retries: d.retries + 1 });
        return;
      }
      setGen('review');
      const h3 = window.setTimeout(() => {
        const work = {
          id: uid('w'),
          creatorId: 'me',
          title,
          intro: d.intro?.trim() || sentences[0]?.slice(0, 60) || '',
          category: cat,
          tags: d.tags,
          origin: d.origin,
          voice: d.voice,
          aiVoiceName: d.voice === 'ai' ? d.aiVoiceName : undefined,
          sentences,
          paid: d.paid && paidOk,
          priceKRW: d.paid && paidOk ? ops.unitPriceKRW : undefined,
          publishedAt: new Date().toISOString(),
          hue: CAT[cat].hue,
          cover: d.cover,
          lang: state.prefs.lang,
          stats: { week: emptyStats(), month: emptyStats() },
          isDemo: false,
          status: 'published',
          version: 1,
        };
        dispatch({ type: 'publishWork', work, draftId: d.id });
        setGen('published');
        const h4 = window.setTimeout(() => {
          onDone();
          push({ kind: 'work', id: work.id });
        }, 900);
        timers.current.push(h4);
      }, 900);
      timers.current.push(h3);
    }, 2200);
    timers.current.push(h1, h2);
  };

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const addTag = (raw) => {
    const v = normTag(raw);
    if (v && !d.tags.includes(v) && d.tags.length < ops.maxTags) patch({ tags: [...d.tags, v] });
    setTagInput('');
  };

  return (
    <div className="screen">
      <header className="topbar">
        {step > 0 && (
          <button type="button" className="icon-btn" onClick={prev} aria-label={t('이전 단계')}>
            <Icon name="chevron-left" />
          </button>
        )}
        <h1 className="page-title">{t('만들기')}</h1>
        <span className="topbar-right muted small">{step > 0 ? t('자동 저장됨') : t('오늘 {left}/{max}회 생성 가능', { left, max: ops.dailyGenerationLimit })}</span>
      </header>

      {step === 0 && (
        <section className="create-step">
          <SectionHead title={t('어떻게 시작할까요?')} sub={t('누구나 바로 올릴 수 있어요. 창작자 전환 절차는 없어요.')} />
          <div className="choose-grid">
            <button
              type="button"
              className="choose"
              onClick={() => {
                setMode('write');
                setStep(1);
              }}
            >
              <Icon name="text" size={36} />
              <span className="choose-title">{t('글로 쓰기')}</span>
              <span className="choose-desc">{t('적으면 AI가 목소리와 자막을 입혀요')}</span>
            </button>
            <button
              type="button"
              className="choose"
              onClick={() => {
                setMode('record');
                setStep(1);
              }}
            >
              <Icon name="mic" size={36} />
              <span className="choose-title">{t('녹음하기')}</span>
              <span className="choose-desc">{t('말로 하면 글로 바꿔 드려요')}</span>
            </button>
          </div>
          {state.drafts.length > 0 && <p className="muted small">{t('적다 만 초안 {n}개가 보관함에 있어요.', { n: state.drafts.length })}</p>}
          <div className="card card-soft small">{t('이후 순서: 대본 확인 → 목소리 → 미리 듣기 → 게시. 각 단계는 자동 저장되고 언제든 이전으로 돌아갈 수 있어요.')}</div>
        </section>
      )}

      {step > 0 && (
        <ol className="stepper" aria-label={t('진행 단계')}>
          {STEPS.map((s, i) => (
            <li key={s} className={i + 1 === step ? 'step-on' : i + 1 < step ? 'step-done' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="step-no">{i + 1}</span>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>
      )}

      {step === 1 && (
        <section className="create-step">
          {mode === 'record' ? (
            <>
              <SectionHead title={t('말로 들려주세요')} sub={t('말한 내용이 글로 적혀요. 적힌 글은 직접 고칠 수 있어요.')} />
              <Button icon="mic" variant={listening ? 'primary' : 'secondary'} size="lg" block onClick={toggleMic} aria-pressed={listening}>
                {listening ? t('듣는 중… (누르면 중지)') : t('녹음 시작 (음성인식)')}
              </Button>
              {listening && (
                <p className="mic-live" aria-live="polite">
                  <span className="mic-dot" aria-hidden="true" /> {interim || t('말씀하세요… 들리는 대로 아래에 적혀요')}
                </p>
              )}
              {micNote && <p className="note">{micNote}</p>}
              <p className="muted small">{t('녹음 파일을 그대로 올려 내 목소리로 게시하는 기능은 2단계에서 열려요. 지금은 말한 내용을 글로 바꾸는 방식이에요.')}</p>
            </>
          ) : (
            <SectionHead title={t('이야기를 적어 주세요')} sub={t('실제 경험담, 창작 이야기, 짧은 생각, 위로의 말 어떤 것도 좋아요.')} />
          )}
          <textarea id="raw-text" className="big-textarea" value={d.rawText} onChange={(e) => patch({ rawText: e.target.value, cleanedText: undefined, approvedScript: undefined })} placeholder={t('예) 월요일 아침, 부장님이 커피 심부름을 시키셨어요…')} rows={mode === 'record' ? 7 : 11} />
          <div className="row-between small muted">
            <span>
              {t('{n}자', { n: d.rawText.length })} · {t('예상 {dur}', { dur: fmtDur(sentenceSec(d.rawText, ops.charsPerSec), t) })}
            </span>
            <span>{d.rawText.length > 4000 ? t('4,000자를 넘으면 생성 비용이 커져요') : ''}</span>
          </div>
          {mode === 'write' && (
            <Button icon="mic" variant={listening ? 'primary' : 'ghost'} onClick={toggleMic} aria-pressed={listening}>
              {listening ? t('듣는 중… (누르면 중지)') : t('말로 덧붙이기')}
            </Button>
          )}
          {mode === 'write' && listening && (
            <p className="mic-live" aria-live="polite">
              <span className="mic-dot" aria-hidden="true" /> {interim || t('말씀하세요… 들리는 대로 아래에 적혀요')}
            </p>
          )}
          {mode === 'write' && micNote && <p className="note">{micNote}</p>}
          <Button
            variant="primary"
            size="lg"
            block
            disabled={d.rawText.trim().length < 10}
            onClick={() => {
              patch({ cleanedText: cleanScript(d.rawText), status: 'script_review' });
              next();
            }}
          >
            {t('대본 정리하기')}
          </Button>
          <p className="muted small">{t('원문·녹음은 대본 정리와 음성 생성에만 쓰여요. AI 학습에 쓰려면 별도 동의를 받고, 초안·원본은 삭제 요청 시 지워요.')}</p>
        </section>
      )}

      {step === 2 && (
        <section className="create-step">
          <SectionHead title={t('대본 확인')} sub={t('문장과 호흡만 다듬었어요. 원문에 없는 사실·사건·대사는 추가하지 않아요.')} />
          <Badge tone="accent">{t('데모 정리 — 2단계에서 LLM 대본 정리로 교체')}</Badge>
          <div className="compare">
            <div>
              <p className="label">{t('원문')}</p>
              <p className="script-text small">{d.rawText}</p>
            </div>
            <div>
              <p className="label">{t('정리안 (직접 고칠 수 있어요)')}</p>
              <textarea id="cleaned-text" className="big-textarea" rows={8} value={d.approvedScript ?? d.cleanedText ?? ''} onChange={(e) => patch({ approvedScript: e.target.value })} />
            </div>
          </div>
          <Toggle id="adapt" label={t('창작적 각색 요청 (선택)')} checked={false} onChange={() => toast(t('각색은 작성자가 켰을 때만 해요. 데모에서는 적용되지 않아요(2단계).'))} />
          <p className="muted small">
            {t('자막 {n}문장', { n: sentences.length })} · {t('예상 길이 {dur}', { dur: fmtDur(sec, t) })}
          </p>
          <div className="btn-row">
            <Button onClick={prev}>{t('이전')}</Button>
            <Button variant="ghost" onClick={() => patch({ approvedScript: d.rawText })}>
              {t('원문 그대로 쓰기')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                patch({ approvedScript: d.approvedScript ?? d.cleanedText });
                next();
              }}
            >
              {t('이 대본으로 할게요')}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="create-step">
          <SectionHead title={t('목소리 선택')} sub={t('내 목소리를 그대로 쓰거나, 허가된 AI 음성을 고를 수 있어요. 각 목소리는 들어보고 고르세요.')} />
          <div className="radio-list">
            <label className={`radio ${d.voice === 'own' ? 'radio-on' : ''}`}>
              <input type="radio" name="voice" checked={d.voice === 'own'} onChange={() => patch({ voice: 'own' })} />
              <span>
                <strong>{t('내 목소리 녹음')}</strong>
                <span className="small muted"> — {t('녹음 업로드는 2단계. 지금은 선택만 되고 재생은 자막으로만 돼요.')}</span>
              </span>
            </label>
            {VOICE_PRESETS.map((v) => (
              <label key={v.id} className={`radio radio-voice ${d.voice === 'ai' && d.aiVoiceName === v.id ? 'radio-on' : ''}`}>
                <input type="radio" name="voice" checked={d.voice === 'ai' && d.aiVoiceName === v.id} onChange={() => patch({ voice: 'ai', aiVoiceName: v.id })} />
                <span>
                  <strong>{t(v.name)}</strong> <span className="small muted">— {t(v.desc)}</span>
                </span>
                <VoiceSample text={sentences[0] ?? t('안녕하세요, 썰에 오신 걸 환영해요.')} choice={v.id} lang={state.prefs.lang} />
              </label>
            ))}
          </div>
          <p className="muted small">{t('자기 목소리 복제, 유명인·타인 목소리 모방은 제공하지 않아요. 듣는 사람은 설정에서 자기가 좋아하는 목소리로 바꿔 들을 수도 있어요.')}</p>
          <div className="btn-row">
            <Button onClick={prev}>{t('이전')}</Button>
            <Button variant="primary" onClick={next}>
              {t('미리 듣기')}
            </Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="create-step">
          <SectionHead title={t('미리 듣기')} sub={t('첫 두 문장만 짧게 들어봐요(비용 절감). 전체 음성은 게시할 때 만들어요.')} />
          <div className="preview-card">
            <div className="preview-head">
              <Cover category={cat} cover={d.cover} size={64} />
              <div className="row-text">
                <span className="row-title">{title}</span>
                <span className="row-sub">
                  {t(CAT[cat].name)} · {fmtDur(sec, t)} · {voiceLabel}
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              icon={lineOn >= 0 ? 'pause' : 'play'}
              block
              onClick={() => {
                if (lineOn >= 0) {
                  stopSpeech();
                  setLineOn(-1);
                } else previewLines();
              }}
            >
              {lineOn >= 0 ? t('멈추기') : t('첫 문장 들어보기')}
            </Button>
            <div className="preview-lines" aria-live="polite">
              {sentences.slice(0, 5).map((s, i) => (
                <p key={i} className={`preview-line ${i === lineOn ? 'preview-line-on' : ''}`}>
                  {s}
                </p>
              ))}
              {sentences.length > 5 && <p className="muted small">{t('… 외 {n}문장', { n: sentences.length - 5 })}</p>}
            </div>
            <p className="muted small">{state.prefs.voiceOn ? t('이 기기의 음성으로 들려드려요(데모). 실제 서비스에서는 서버에서 만든 음성 파일을 들어요.') : t('설정에서 음성이 꺼져 있어 자막만 확인할 수 있어요.')}</p>
          </div>
          <div className="btn-row">
            <Button onClick={prev}>{t('목소리 바꾸기')}</Button>
            <Button
              variant="primary"
              onClick={() => {
                stopSpeech();
                setLineOn(-1);
                next();
              }}
            >
              {t('좋아요, 게시 준비')}
            </Button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="create-step">
          <SectionHead title={t('게시 전 확인')} sub={t('추천값을 넣어 두었어요. 바꿀 것만 열어서 고치세요.')} />
          <details className="section" open>
            <summary>
              <span>{t('제목·소개')}</span>
            </summary>
            <div className="section-body">
              <label className="field">
                <span>{t('제목')}</span>
                <input id="title" type="text" value={d.title ?? ''} onChange={(e) => patch({ title: e.target.value })} placeholder={autoTitle(script)} maxLength={40} />
              </label>
              <label className="field">
                <span>{t('소개 (한 줄)')}</span>
                <input id="intro" type="text" value={d.intro ?? ''} onChange={(e) => patch({ intro: e.target.value })} placeholder={sentences[0]?.slice(0, 50)} maxLength={80} />
              </label>
            </div>
          </details>
          <details className="section" open>
            <summary>
              <span>{t('대표 이미지')}</span>
              <span className="summary-val">{d.cover ? (d.cover.kind === 'image' ? t('내 사진') : t('색 배경')) : t('카테고리 기본')}</span>
            </summary>
            <div className="section-body">
              <div className="cover-preview-row">
                <Cover category={cat} cover={d.cover} size={120} radius={18} />
                <p className="small muted">{t('카테고리 이름이 큰 글씨로 들어가요. 배경은 기본 색, 프리셋, 내 사진 중에서 고를 수 있어요.')}</p>
              </div>
              <CoverPicker value={d.cover} onChange={(c) => patch({ cover: c })} defaultLabel={t('기본')} />
            </div>
          </details>
          <details className="section">
            <summary>
              <span>{t('카테고리·해시태그')}</span>
              <span className="summary-val">
                {t(CAT[cat].name)} · {d.tags.length ? d.tags.map((x) => `#${x}`).join(' ') : t('태그 없음')}
              </span>
            </summary>
            <div className="section-body">
              <p className="label">
                {t('대표 카테고리')} <span className="muted small">{t('추천: {name}', { name: t(CAT[guessed].name) })}</span>
              </p>
              <div className="chip-row chip-wrap">
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} active={cat === c.id} onClick={() => patch({ category: c.id })}>
                    {t(c.name)}
                  </Chip>
                ))}
              </div>
              <p className="label">
                {t('해시태그')} <span className="muted small">{t('최대 {n}개 · 추천을 누르면 추가', { n: ops.maxTags })}</span>
              </p>
              <div className="chip-row chip-wrap">
                {d.tags.map((x) => (
                  <Chip key={x} active onClick={() => patch({ tags: d.tags.filter((y) => y !== x) })}>
                    #{x} <Icon name="x" size={12} />
                  </Chip>
                ))}
                {tagSug
                  .filter((x) => !d.tags.includes(x))
                  .map((x) => (
                    <Chip key={x} onClick={() => addTag(x)}>
                      + #{x}
                    </Chip>
                  ))}
              </div>
              <div className="comment-input">
                <input
                  id="tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t('직접 입력 (예: 출근길)')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  aria-label={t('해시태그 입력')}
                />
                <Button size="sm" onClick={() => addTag(tagInput)}>
                  {t('추가')}
                </Button>
              </div>
            </div>
          </details>
          <details className="section">
            <summary>
              <span>{t('이야기 성격·공개 방식')}</span>
              <span className="summary-val">
                {t(d.origin === 'true' ? '실화' : d.origin === 'adapted' ? '각색' : '창작')} · {d.paid && paidOk ? t('유료 {price}', { price: fmtKRW(ops.unitPriceKRW, t) }) : t('무료')}
              </span>
            </summary>
            <div className="section-body">
              <p className="label">
                {t('이야기 성격')} <span className="muted small">{t('작성자 표시이며 플랫폼이 검증하지 않아요')}</span>
              </p>
              <div className="chip-row">
                {['true', 'adapted', 'fiction'].map((o) => (
                  <Chip key={o} active={d.origin === o} onClick={() => patch({ origin: o })}>
                    {t(o === 'true' ? '실화' : o === 'adapted' ? '각색' : '창작')}
                  </Chip>
                ))}
              </div>
              <p className="label">{t('공개 방식')}</p>
              <div className="radio-list">
                <label className={`radio ${d.paid ? '' : 'radio-on'}`}>
                  <input type="radio" name="paid" checked={!d.paid} onChange={() => patch({ paid: false })} />
                  <span>
                    <strong>{t('무료')}</strong> <span className="small muted">{t('— 누구나 듣고, 구독으로 이어져요')}</span>
                  </span>
                </label>
                <label className={`radio ${d.paid ? 'radio-on' : ''} ${paidOk ? '' : 'radio-off'}`}>
                  <input type="radio" name="paid" checked={d.paid} disabled={!paidOk} onChange={() => patch({ paid: true })} />
                  <span>
                    <strong>{t('유료 {price}', { price: fmtKRW(ops.unitPriceKRW, t) })}</strong>
                    <span className="small muted">
                      {' '}
                      — {approved ? (paidLengthOk({ sentences }, ops) ? t('미리듣기 후 구매') : t('{min} 이상 작품만 가능 (지금 {now})', { min: fmtDur(ops.paidMinSec, t), now: fmtDur(sec, t) })) : t('유료화 심사 승인 후 가능')}
                    </span>
                  </span>
                </label>
              </div>
              {!approved && (
                <Button size="sm" variant="ghost" onClick={() => push({ kind: 'paid-apply' })}>
                  {t('유료화 신청 조건 보기')}
                </Button>
              )}
            </div>
          </details>
          <div className={`card ${pii.length ? 'card-warn' : 'card-good'}`}>
            <strong>{pii.length ? t('개인정보로 보이는 내용 {n}건', { n: pii.length }) : t('개인정보 후보가 보이지 않아요')}</strong>
            {pii.map((p, i) => (
              <p key={i} className="small">
                {t(p.kind)}: <code>{p.sample}</code>
              </p>
            ))}
            <p className="small muted">{t('자동 점검은 보조 수단이에요. 타인의 이름·직장·주소가 특정되지 않는지 직접 확인해 주세요.')}</p>
          </div>
          <label className="check">
            <input type="checkbox" checked={checks.rights} onChange={(e) => setChecks((c) => ({ ...c, rights: e.target.checked }))} />
            <span>{t('내가 직접 쓴 글이거나 사용 권리가 있어요. 다른 커뮤니티 글·웹소설·영상 대본을 복사하지 않았어요.')}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={checks.privacy} onChange={(e) => setChecks((c) => ({ ...c, privacy: e.target.checked }))} />
            <span>{t('타인을 특정할 수 있는 정보가 없어요. 게시 뒤 수정하면 음성·자막이 같은 버전으로 다시 생성돼요.')}</span>
          </label>
          <Toggle id="force-fail" label={t('생성 실패 시연 (재시도 흐름 보기)')} checked={forceFail} onChange={setForceFail} />
          {gen && (
            <ol className="status-line" aria-live="polite">
              {['queued', 'generating', 'review', 'published'].map((s) => {
                const order = ['queued', 'generating', 'review', 'published'];
                const cur = order.indexOf(gen === 'failed' ? 'generating' : gen);
                const i = order.indexOf(s);
                return (
                  <li key={s} className={gen === 'failed' && s === 'generating' ? 'st-fail' : i < cur ? 'st-done' : i === cur ? 'st-on' : ''}>
                    {gen === 'failed' && s === 'generating' ? t('실패') : t(STATUS[s])}
                  </li>
                );
              })}
            </ol>
          )}
          {gen === 'failed' ? (
            <div className="card card-warn">
              <strong>{t('생성에 실패했어요')}</strong>
              <p className="small">
                {t('원인')}: {d.failReason}
              </p>
              <p className="small muted">{t('재시도 {n}/{max}회 사용. 한도를 넘으면 운영팀 확인 후 다시 열려요.', { n: d.retries, max: ops.maxRetries })}</p>
              <div className="btn-row">
                <Button
                  variant="primary"
                  disabled={d.retries >= ops.maxRetries}
                  onClick={() => {
                    setForceFail(false);
                    generate(false);
                  }}
                >
                  {t('다시 시도')}
                </Button>
                <Button
                  onClick={() => {
                    setGen(null);
                    patch({ status: 'draft' });
                    toast(t('초안으로 저장했어요. 보관함에서 이어서 만들 수 있어요.'));
                  }}
                >
                  {t('취소하고 초안으로')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="btn-row">
              <Button onClick={prev} disabled={!!gen}>
                {t('이전')}
              </Button>
              <Button variant="primary" size="lg" disabled={!checks.rights || !checks.privacy || !!gen || sentences.length === 0} onClick={() => requireLogin(() => generate(forceFail))}>
                {gen ? t(STATUS[gen]) + '…' : t('음성·자막 만들고 게시')}
              </Button>
            </div>
          )}
          <p className="muted small">{t('승인한 대본만 전체 생성해요. 같은 대본은 다시 생성하지 않고(중복 방지), 계정별 하루 {n}회·재시도 {r}회로 비용을 관리해요. 지금은 데모 생성(실제 AI 호출 없음).', { n: ops.dailyGenerationLimit, r: ops.maxRetries })}</p>
        </section>
      )}
    </div>
  );
}
