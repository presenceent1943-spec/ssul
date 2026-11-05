// 기기 내장 음성(Web Speech API) 래퍼 + 목소리 프리셋
const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export function speechSupported() {
  try {
    return !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  } catch {
    return false;
  }
}

// 목소리 프리셋: 같은 기기 음성이라도 속도·높낮이를 달리해 느낌을 바꾼다.
// pick: 기기에 여러 음성이 있을 때 몇 번째 음성을 우선 쓸지 (프리셋마다 다른 음성이 배정되도록)
export const VOICE_PRESETS = [
  { id: 'haneul', name: '하늘', desc: '차분한 톤', rate: 1, pitch: 1, pick: 0 },
  { id: 'bada', name: '바다', desc: '낮고 느린 톤', rate: 0.86, pitch: 0.78, pick: 1 },
  { id: 'sup', name: '숲', desc: '밝고 경쾌한 톤', rate: 1.06, pitch: 1.22, pick: 2 },
  { id: 'saebyeok', name: '새벽', desc: '속삭이듯 잔잔하게 · 잠들기 전', rate: 0.78, pitch: 0.9, pick: 3, volume: 0.8 },
  { id: 'radio', name: '라디오', desc: '또렷한 DJ 톤', rate: 1.14, pitch: 1.04, pick: 1 },
  { id: 'donghwa', name: '동화', desc: '천천히 따뜻하게 읽어 주는 톤', rate: 0.9, pitch: 1.12, pick: 2 },
  { id: 'mint', name: '민트', desc: '가볍고 빠른 수다 톤', rate: 1.22, pitch: 1.3, pick: 3 },
  { id: 'gyeoul', name: '겨울', desc: '묵직하고 느린 내레이션', rate: 0.82, pitch: 0.7, pick: 0 },
];

export const PRESET = Object.fromEntries(VOICE_PRESETS.map((p) => [p.id, p]));

export function listVoices(lang = 'ko') {
  try {
    if (!synth) return [];
    const all = synth.getVoices();
    const pref = all.filter((v) => v.lang.toLowerCase().startsWith(lang));
    return pref.length ? pref : all;
  } catch {
    return [];
  }
}

export function allVoices() {
  try {
    return synth ? synth.getVoices() : [];
  } catch {
    return [];
  }
}

// 재생에 쓸 음성 결정: 프리셋 id 또는 'browser:<voiceURI>'
export function resolveVoice(choice, lang = 'ko') {
  const voices = listVoices(lang);
  if (choice && choice.startsWith('browser:')) {
    const uri = choice.slice(8);
    const v = allVoices().find((x) => x.voiceURI === uri || x.name === uri);
    return { voice: v ?? voices[0], rate: 1, pitch: 1, volume: 1, label: v?.name ?? choice };
  }
  const p = PRESET[choice] ?? VOICE_PRESETS[0];
  const v = voices.length ? voices[p.pick % voices.length] : undefined;
  return { voice: v, rate: p.rate, pitch: p.pitch, volume: p.volume ?? 1, label: p.name };
}

let current = null;

export function speak(text, opt) {
  if (!speechSupported() || !synth) return false;
  try {
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opt.lang ?? 'ko-KR';
    u.rate = Math.min(2.5, Math.max(0.4, opt.rate ?? 1));
    u.pitch = Math.min(2, Math.max(0.3, opt.pitch ?? 1));
    u.volume = Math.min(1, Math.max(0, opt.volume ?? 1));
    if (opt.voice) u.voice = opt.voice;
    let done = false;
    u.onend = () => {
      if (done) return;
      done = true;
      if (current === u) current = null;
      opt.onEnd?.();
    };
    u.onerror = () => {
      if (done) return;
      done = true;
      if (current === u) current = null;
      opt.onError?.();
    };
    current = u;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeech() {
  try {
    if (current) {
      current.onend = null;
      current.onerror = null;
      current = null;
    }
    synth?.cancel();
  } catch {}
}

export function onVoicesReady(cb) {
  try {
    if (!synth) return () => {};
    const h = () => cb();
    synth.addEventListener('voiceschanged', h);
    if (synth.getVoices().length > 0) cb();
    return () => synth.removeEventListener('voiceschanged', h);
  } catch {
    return () => {};
  }
}
