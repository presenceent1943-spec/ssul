import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { canAccess, idxAt, previewCutoff, timeline, totalSec } from './util.js';
import { listVoices, onVoicesReady, resolveVoice, speak, stopSpeech } from './speech.js';
import { LOCALE } from './i18n.js';

const TICK = 200;

// 작품에 쓸 목소리: 듣는 사람이 '내 목소리'를 골랐으면 그걸, 아니면 작가가 고른 프리셋
export function voiceFor(work, prefs) {
  const choice = prefs.voiceMode === 'mine' ? prefs.myVoice : work?.aiVoiceName ?? 'haneul';
  const r = resolveVoice(choice, work?.lang ?? 'ko');
  return { ...r, pitch: r.pitch * (prefs.pitchAdj ?? 1) };
}

export function usePlayer() {
  const { state, dispatch, works } = useStore();
  const byId = useMemo(() => Object.fromEntries(works.map((w) => [w.id, w])), [works]);
  const [ui, setUi] = useState({
    workId: null,
    playing: false,
    time: 0,
    mode: 'audio',
    sleep: { kind: 'off' },
    previewEnded: false,
    ended: false,
    expanded: false,
    queue: [],
    voiceReady: false,
  });
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const speaking = useRef(false);
  const spokenKey = useRef('');
  const lastSave = useRef(0);
  const prefsRef = useRef(state.prefs);
  prefsRef.current = state.prefs;
  const opsRef = useRef(state.ops);
  opsRef.current = state.ops;
  const purchasesRef = useRef(state.purchases);
  purchasesRef.current = state.purchases;
  const posRef = useRef(state.positions);
  posRef.current = state.positions;

  const work = ui.workId ? byId[ui.workId] : undefined;
  const cps = state.ops.charsPerSec;
  const tl = useMemo(() => (work ? timeline(work.sentences, cps) : []), [work, cps]);
  const total = work ? totalSec(work.sentences, cps) : 0;
  const access = !work || canAccess(work, state.purchases, work.creatorId === 'me');
  const cutoff = work ? (access ? total : previewCutoff(work.sentences, state.ops)) : 0;
  const sentenceIdx = idxAt(tl, ui.time);

  useEffect(() => onVoicesReady(() => setUi((u) => ({ ...u, voiceReady: listVoices('ko').length > 0 }))), []);

  const stopVoice = useCallback(() => {
    stopSpeech();
    speaking.current = false;
    spokenKey.current = '';
  }, []);

  const savePos = useCallback((id, sec) => dispatch({ type: 'setPosition', workId: id, sec }), [dispatch]);

  const load = useCallback(
    (id, opt) => {
      const w = byId[id];
      if (!w) return;
      const cur = uiRef.current;
      if (cur.workId && cur.workId !== id) savePos(cur.workId, cur.time);
      stopVoice();
      const t = timeline(w.sentences, opsRef.current.charsPerSec);
      const end = t.length ? t[t.length - 1].end : 0;
      const from = opt?.from ?? posRef.current[id] ?? 0;
      const start = from >= end - 1 ? 0 : from;
      setUi((u) => ({
        ...u,
        workId: id,
        time: start,
        playing: opt?.autoplay ?? true,
        previewEnded: false,
        ended: false,
        expanded: opt?.expanded ?? u.expanded,
        queue: opt?.queue ?? u.queue,
      }));
    },
    [byId, savePos, stopVoice]
  );

  const play = useCallback(() => {
    const cur = uiRef.current;
    if (!cur.workId) return;
    if (cur.ended || cur.previewEnded) {
      stopVoice();
      setUi((u) => ({ ...u, time: 0, playing: true, ended: false, previewEnded: false }));
    } else setUi((u) => ({ ...u, playing: true }));
  }, [stopVoice]);

  const pause = useCallback(() => {
    stopVoice();
    const cur = uiRef.current;
    if (cur.workId) savePos(cur.workId, cur.time);
    setUi((u) => ({ ...u, playing: false }));
  }, [stopVoice, savePos]);

  const toggle = useCallback(() => (uiRef.current.playing ? pause() : play()), [pause, play]);

  const seek = useCallback(
    (sec) => {
      if (!work) return;
      const cur = uiRef.current;
      const max = Math.max(0, cutoff - 0.01);
      let t = Math.min(Math.max(0, sec), max);
      if (prefsRef.current.voiceOn && cur.voiceReady) {
        const i = idxAt(tl, t);
        t = Math.min(tl[i]?.start ?? 0, max);
      }
      stopVoice();
      setUi((u) => ({ ...u, time: t, ended: false, previewEnded: false, playing: cur.playing }));
    },
    [work, cutoff, tl, stopVoice]
  );

  const skip = useCallback((d) => seek(uiRef.current.time + d), [seek]);
  const setMode = useCallback((mode) => setUi((u) => ({ ...u, mode })), []);
  const setExpanded = useCallback((expanded) => setUi((u) => ({ ...u, expanded })), []);
  const setSleep = useCallback((sleep) => setUi((u) => ({ ...u, sleep })), []);
  const setSpeed = useCallback(
    (speed) => {
      dispatch({ type: 'setPrefs', prefs: { speed } });
      stopVoice();
    },
    [dispatch, stopVoice]
  );

  const nextCandidate = useCallback(() => {
    const cur = uiRef.current;
    if (!cur.workId) return null;
    const w = byId[cur.workId];
    if (!w) return null;
    if (w.seriesId && w.episodeNo != null) {
      const n = works.find((x) => x.seriesId === w.seriesId && x.episodeNo === (w.episodeNo ?? 0) + 1);
      if (n) return { work: n, locked: !canAccess(n, purchasesRef.current, n.creatorId === 'me') };
    }
    const q = cur.queue.filter((id) => id !== cur.workId && byId[id]);
    if (q.length) {
      const n = byId[q[0]];
      return { work: n, locked: !canAccess(n, purchasesRef.current, n.creatorId === 'me') };
    }
    return null;
  }, [byId, works]);

  const next = useCallback(() => {
    const c = nextCandidate();
    if (!c || c.locked) return false;
    const cur = uiRef.current;
    load(c.work.id, { autoplay: true, from: 0, queue: cur.queue.filter((id) => id !== c.work.id) });
    return true;
  }, [nextCandidate, load]);

  const close = useCallback(() => {
    const cur = uiRef.current;
    stopVoice();
    if (cur.workId) savePos(cur.workId, cur.time);
    setUi((u) => ({ ...u, workId: null, playing: false, expanded: false, ended: false, previewEnded: false, time: 0 }));
  }, [stopVoice, savePos]);

  // 시간 진행
  useEffect(() => {
    if (!ui.playing || !work) return;
    const h = window.setInterval(() => {
      const cur = uiRef.current;
      if (!cur.playing || !cur.workId) return;
      const now = Date.now();
      if (cur.sleep.kind === 'minutes' && now >= cur.sleep.endsAt) {
        stopVoice();
        savePos(cur.workId, cur.time);
        setUi((u) => ({ ...u, playing: false, sleep: { kind: 'off' } }));
        return;
      }
      const step = (TICK / 1e3) * prefsRef.current.speed;
      let t = cur.time + step;
      const i = idxAt(tl, cur.time);
      const seg = tl[i];
      if (speaking.current && seg && t >= seg.end) t = seg.end - 0.01;
      if (t >= cutoff) {
        stopVoice();
        if (cutoff < total) {
          savePos(cur.workId, 0);
          setUi((u) => ({ ...u, time: cutoff, playing: false, previewEnded: true }));
        } else {
          dispatch({ type: 'markCompleted', workId: cur.workId });
          dispatch({ type: 'countListen', workId: cur.workId });
          const c = nextCandidate();
          if (prefsRef.current.autoplay && cur.sleep.kind !== 'end' && c && !c.locked) {
            load(c.work.id, { autoplay: true, from: 0, queue: cur.queue.filter((id) => id !== c.work.id) });
          } else {
            setUi((u) => ({ ...u, time: total, playing: false, ended: true, sleep: u.sleep.kind === 'end' ? { kind: 'off' } : u.sleep }));
          }
        }
      } else {
        if (now - lastSave.current > 3e3) {
          lastSave.current = now;
          savePos(cur.workId, t);
        }
        setUi((u) => ({ ...u, time: t }));
      }
    }, TICK);
    return () => window.clearInterval(h);
  }, [ui.playing, work, tl, cutoff, total, dispatch, savePos, stopVoice, nextCandidate, load]);

  // 문장 단위 음성
  useEffect(() => {
    if (!ui.playing || !work || !state.prefs.voiceOn || !ui.voiceReady) return;
    const key = `${work.id}:${sentenceIdx}`;
    if (spokenKey.current === key) return;
    const seg = tl[sentenceIdx];
    if (!seg || seg.start >= cutoff) return;
    spokenKey.current = key;
    let vol = 1;
    if (ui.sleep.kind === 'minutes') {
      const left = (ui.sleep.endsAt - Date.now()) / 1e3;
      if (left < 60) vol = Math.max(0.15, left / 60);
    }
    const v = voiceFor(work, state.prefs);
    speaking.current = true;
    const ok = speak(work.sentences[sentenceIdx], {
      lang: LOCALE[work.lang ?? 'ko'] ?? 'ko-KR',
      rate: state.prefs.speed * v.rate,
      pitch: v.pitch,
      volume: vol * v.volume,
      voice: v.voice,
      onEnd: () => {
        speaking.current = false;
        if (spokenKey.current === key) setUi((u) => (u.playing && u.workId === work.id ? { ...u, time: Math.min(seg.end, cutoff) } : u));
      },
      onError: () => {
        speaking.current = false;
      },
    });
    if (!ok) speaking.current = false;
  }, [ui.playing, ui.voiceReady, ui.sleep, work, sentenceIdx, tl, cutoff, state.prefs]);

  useEffect(() => {
    if (!state.prefs.voiceOn) stopVoice();
  }, [state.prefs.voiceOn, stopVoice]);

  // 목소리 설정이 바뀌면 현재 문장부터 다시
  useEffect(() => {
    stopVoice();
  }, [state.prefs.voiceMode, state.prefs.myVoice, state.prefs.pitchAdj, stopVoice]);

  useEffect(() => {
    const h = () => {
      const cur = uiRef.current;
      if (cur.workId) savePos(cur.workId, cur.time);
      stopSpeech();
    };
    window.addEventListener('pagehide', h);
    return () => window.removeEventListener('pagehide', h);
  }, [savePos]);

  return { ui, work, timeline: tl, total, cutoff, access, sentenceIdx, load, play, pause, toggle, seek, skip, setMode, setExpanded, setSleep, setSpeed, next, nextCandidate, close };
}
