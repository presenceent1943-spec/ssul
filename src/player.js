import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store.jsx';
import { canAccess, idxAt, previewCutoff, timeline, totalSec } from './util.js';
import { listVoices, onVoicesReady, resolveVoice, speak, stopSpeech, DEFAULT_VOICE } from './speech.js';
import { LOCALE } from './i18n.js';
import { resolveMediaUrl } from './blobstore.js';

const TICK = 200;

// 서버에서 만든 음성 파일(work.audio = { url, duration, cues: [[시작, 끝], …] })이 있으면 TTS 대신 그 파일을 튼다.
function audioTimeline(work) {
  return (work?.audio?.cues ?? []).map(([start, end]) => ({ start, end }));
}
function cutoffOf(tl, total, ops) {
  let cut = 0;
  for (const seg of tl) {
    if (seg.end <= ops.previewMaxSec) cut = seg.end;
    else break;
  }
  return cut > 0 ? cut : Math.min(ops.previewMaxSec, total);
}

// 작품에 쓸 목소리: 듣는 사람이 '내 목소리'를 골랐으면 그걸, 아니면 작가가 고른 프리셋
export function voiceFor(work, prefs) {
  const choice = prefs.voiceMode === 'mine' ? prefs.myVoice : work?.aiVoiceName ?? DEFAULT_VOICE;
  const r = resolveVoice(choice, work?.lang ?? 'ko', { female: prefs.voiceFemale, male: prefs.voiceMale });
  return { ...r, pitch: r.pitch * (prefs.pitchAdj ?? 1) };
}

// 대화형 대본: 그 문장을 말하는 등장인물이 있고 작가가 목소리를 배정했으면 그 목소리로 (듣는 사람의 '내 목소리'는 화자 본인 줄에만 적용)
export function voiceForLine(work, idx, prefs) {
  const who = work?.speakers?.[idx];
  const persona = who && work?.cast?.[who];
  if (persona) {
    const r = resolveVoice(persona, work?.lang ?? 'ko', { female: prefs.voiceFemale, male: prefs.voiceMale });
    return { ...r, pitch: r.pitch * (prefs.pitchAdj ?? 1), speaker: who };
  }
  return voiceFor(work, prefs);
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
  const audioRef = useRef(null);
  const [audioBad, setAudioBad] = useState({});
  // 기기에 저장된 생성 음성(idb:)은 미리 blob 주소로 풀어 둔다 (클릭 안에서 바로 틀 수 있게)
  const [mediaUrls, setMediaUrls] = useState({});
  useEffect(() => {
    let alive = true;
    const pending = works.filter((w) => w.audio?.url?.startsWith('idb:') && !(w.id in mediaUrls));
    if (!pending.length) return;
    Promise.all(pending.map(async (w) => [w.id, await resolveMediaUrl(w.audio.url).catch(() => null)])).then((pairs) => {
      if (alive) setMediaUrls((m) => ({ ...m, ...Object.fromEntries(pairs) }));
    });
    return () => {
      alive = false;
    };
  }, [works]); // eslint-disable-line
  const fileUrlOf = useCallback(
    (w) => {
      const u = w?.audio?.url;
      if (!u) return null;
      if (u.startsWith('idb:')) return mediaUrls[w.id] ?? null;
      return u.startsWith('http') || u.startsWith('data:') || u.startsWith('blob:') ? u : new URL(u, document.baseURI).href;
    },
    [mediaUrls]
  );

  const work = ui.workId ? byId[ui.workId] : undefined;
  const cps = state.ops.charsPerSec;
  const hasAudio = !!work && !!fileUrlOf(work) && !audioBad[work.id];
  const tl = useMemo(() => (work ? (hasAudio ? audioTimeline(work) : timeline(work.sentences, cps)) : []), [work, cps, hasAudio]);
  const total = work ? (hasAudio ? work.audio.duration : totalSec(work.sentences, cps)) : 0;
  const access = !work || canAccess(work, state.purchases, work.creatorId === 'me');
  const cutoff = work ? (access ? total : hasAudio ? cutoffOf(tl, total, state.ops) : previewCutoff(work.sentences, state.ops)) : 0;
  const sentenceIdx = idxAt(tl, ui.time);
  const hasAudioRef = useRef(hasAudio);
  hasAudioRef.current = hasAudio;

  // 음성 파일 요소 (한 번만 만든다)
  const getAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    if (typeof Audio === 'undefined') return null;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('error', () => {
      const id = a.dataset.workId;
      if (id) setAudioBad((b) => ({ ...b, [id]: true }));
    });
    audioRef.current = a;
    return a;
  }, []);
  // 클릭 안에서 바로 play()를 불러야 아이폰에서 소리가 난다
  const startAudio = useCallback(
    (w, from, playing) => {
      const url = w ? fileUrlOf(w) : null;
      if (!url || audioBad[w.id]) return;
      const a = getAudio();
      if (!a) return;
      if (a.dataset.workId !== w.id || a.src !== url) {
        a.dataset.workId = w.id;
        a.src = url;
        a.load();
      }
      try {
        a.currentTime = from;
      } catch {}
      a.playbackRate = prefsRef.current.speed;
      a.muted = !prefsRef.current.voiceOn;
      if (playing) a.play().catch(() => {});
      else a.pause();
    },
    [getAudio, audioBad, fileUrlOf]
  );

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
      const file = fileUrlOf(w) && !audioBad[w.id];
      const t = file ? audioTimeline(w) : timeline(w.sentences, opsRef.current.charsPerSec);
      const end = t.length ? t[t.length - 1].end : 0;
      const from = opt?.from ?? posRef.current[id] ?? 0;
      const start = from >= end - 1 ? 0 : from;
      if (file) startAudio(w, start, opt?.autoplay ?? true);
      else audioRef.current?.pause();
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
    [byId, savePos, stopVoice, startAudio, audioBad, fileUrlOf]
  );

  const play = useCallback(() => {
    const cur = uiRef.current;
    if (!cur.workId) return;
    const w = byId[cur.workId];
    const restart = cur.ended || cur.previewEnded;
    if (restart) stopVoice();
    if (hasAudioRef.current && w) startAudio(w, restart ? 0 : cur.time, true);
    if (restart) setUi((u) => ({ ...u, time: 0, playing: true, ended: false, previewEnded: false }));
    else setUi((u) => ({ ...u, playing: true }));
  }, [stopVoice, byId, startAudio]);

  const pause = useCallback(() => {
    stopVoice();
    audioRef.current?.pause();
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
      if (prefsRef.current.voiceOn && (cur.voiceReady || hasAudio)) {
        const i = idxAt(tl, t);
        t = Math.min(tl[i]?.start ?? 0, max);
      }
      stopVoice();
      if (hasAudio) startAudio(work, t, cur.playing);
      setUi((u) => ({ ...u, time: t, ended: false, previewEnded: false, playing: cur.playing }));
    },
    [work, cutoff, tl, stopVoice, hasAudio, startAudio]
  );

  const skip = useCallback((d) => seek(uiRef.current.time + d), [seek]);
  const setMode = useCallback((mode) => setUi((u) => ({ ...u, mode })), []);
  const setExpanded = useCallback((expanded) => setUi((u) => ({ ...u, expanded })), []);
  const setSleep = useCallback((sleep) => setUi((u) => ({ ...u, sleep })), []);
  const setSpeed = useCallback(
    (speed) => {
      dispatch({ type: 'setPrefs', prefs: { speed } });
      stopVoice();
      if (audioRef.current) audioRef.current.playbackRate = speed;
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
    audioRef.current?.pause();
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
      const a = audioRef.current;
      const useFile = hasAudioRef.current && a;
      let t;
      if (useFile) {
        if (a.paused && !a.ended && a.readyState >= 2 && a.src) a.play().catch(() => {});
        t = a.ended ? total : a.readyState >= 1 ? a.currentTime : cur.time;
        if (cur.sleep.kind === 'minutes') {
          const left = (cur.sleep.endsAt - now) / 1e3;
          a.volume = left < 60 ? Math.max(0.15, left / 60) : 1;
        } else if (a.volume !== 1) a.volume = 1;
      } else {
        const step = (TICK / 1e3) * prefsRef.current.speed;
        t = cur.time + step;
        const i = idxAt(tl, cur.time);
        const seg = tl[i];
        if (speaking.current && seg && t >= seg.end) t = seg.end - 0.01;
      }
      if (t >= cutoff - (useFile && cutoff < total ? 0.05 : 0)) {
        stopVoice();
        if (useFile) a.pause();
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
    if (!ui.playing || !work || !state.prefs.voiceOn || !ui.voiceReady || hasAudio) return;
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
    const v = voiceForLine(work, sentenceIdx, state.prefs);
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
  }, [ui.playing, ui.voiceReady, ui.sleep, work, sentenceIdx, tl, cutoff, state.prefs, hasAudio]);

  useEffect(() => {
    if (!state.prefs.voiceOn) stopVoice();
    if (audioRef.current) audioRef.current.muted = !state.prefs.voiceOn;
  }, [state.prefs.voiceOn, stopVoice]);

  // 파일 재생 중 재생/정지 상태를 요소에 맞춘다 (키보드·수면 타이머 등 클릭 밖에서 바뀐 경우)
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasAudio) return;
    if (ui.playing) {
      if (a.paused) a.play().catch(() => {});
    } else if (!a.paused) a.pause();
  }, [ui.playing, hasAudio]);
  // 파일이 깨졌으면 TTS로 이어 간다
  useEffect(() => {
    if (!work || !work.audio?.url || !audioBad[work.id]) return;
    stopVoice();
    setUi((u) => ({ ...u, time: 0 }));
  }, [work, audioBad, stopVoice]);

  // 목소리 설정이 바뀌면 현재 문장부터 다시
  useEffect(() => {
    stopVoice();
  }, [state.prefs.voiceMode, state.prefs.myVoice, state.prefs.pitchAdj, stopVoice]);

  useEffect(() => {
    const h = () => {
      const cur = uiRef.current;
      if (cur.workId) savePos(cur.workId, cur.time);
      stopSpeech();
      audioRef.current?.pause();
    };
    window.addEventListener('pagehide', h);
    return () => window.removeEventListener('pagehide', h);
  }, [savePos]);

  return { ui, work, timeline: tl, total, cutoff, access, sentenceIdx, hasAudio, load, play, pause, toggle, seek, skip, setMode, setExpanded, setSleep, setSpeed, next, nextCandidate, close };
}
