// 기기 내장 음성(Web Speech API) 래퍼 + 목소리 페르소나
// 라디오처럼 연령대·성별이 다른 목소리를 고를 수 있게, 기기에 설치된 음성 중 성별이 맞는 것을 찾아
// 속도·높낮이를 페르소나별로 달리 준다. (서버 TTS로 바뀌면 같은 id로 실제 다른 화자를 배정한다.)
const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

export function speechSupported() {
  try {
    return !!synth && typeof SpeechSynthesisUtterance !== 'undefined';
  } catch {
    return false;
  }
}

// gender: f(여성) / m(남성) — 기기 음성 선택 기준. pick: 같은 성별 음성이 여러 개일 때 몇 번째를 쓸지.
export const VOICE_PRESETS = [
  { id: 'w20', name: '20대 여성', desc: '밝고 또랑또랑한 톤', gender: 'f', rate: 1.08, pitch: 1.2, pick: 0 },
  { id: 'w30', name: '30대 여성', desc: '차분한 라디오 DJ 톤', gender: 'f', rate: 1.0, pitch: 1.02, pick: 1 },
  { id: 'w50', name: '50대 여성', desc: '따뜻하고 느긋한 엄마 톤', gender: 'f', rate: 0.9, pitch: 0.9, pick: 0 },
  { id: 'w70', name: '70대 여성', desc: '느리고 포근한 할머니 톤', gender: 'f', rate: 0.78, pitch: 0.8, pick: 1 },
  { id: 'kid', name: '아이', desc: '높고 천진한 톤', gender: 'f', rate: 1.1, pitch: 1.45, pick: 0 },
  { id: 'whisper', name: '속삭임', desc: '잠들기 전, 잔잔하게', gender: 'f', rate: 0.8, pitch: 0.95, pick: 1, volume: 0.75 },
  { id: 'm20', name: '20대 남성', desc: '가볍고 빠른 수다 톤', gender: 'm', rate: 1.1, pitch: 1.1, pick: 0 },
  { id: 'm30', name: '30대 남성', desc: '또렷한 내레이션 톤', gender: 'm', rate: 1.0, pitch: 0.94, pick: 1 },
  { id: 'm50', name: '50대 남성', desc: '낮고 묵직한 아저씨 톤', gender: 'm', rate: 0.9, pitch: 0.76, pick: 0 },
  { id: 'm70', name: '70대 남성', desc: '느릿하고 깊은 할아버지 톤', gender: 'm', rate: 0.78, pitch: 0.66, pick: 1 },
];

export const VOICE_GROUPS = [
  { id: 'f', name: '여성 목소리' },
  { id: 'm', name: '남성 목소리' },
];

// 예전 프리셋 이름(하늘·바다·숲…)으로 저장된 작품·초안도 그대로 재생되게 한다.
const ALIAS = { haneul: 'w30', bada: 'm50', sup: 'w20', saebyeok: 'whisper', radio: 'm30', donghwa: 'w50', mint: 'm20', gyeoul: 'm70' };
export const DEFAULT_VOICE = 'w30';

const byId = Object.fromEntries(VOICE_PRESETS.map((p) => [p.id, p]));
export const PRESET = { ...byId, ...Object.fromEntries(Object.entries(ALIAS).map(([k, v]) => [k, byId[v]])) };

// 기기 음성 이름으로 성별 추정 (iOS·맥: Yuna·Sora / 윈도우: Heami·SunHi·InJoon·Hyunsu / 안드로이드 구글: ism·kob·koc(여) kod(남))
const FEMALE = /yuna|sora|suhyun|jian|heami|sunhi|jimin|seohyeon|soonbok|yujin|seoyeon|jiyoung|nara|hyeri|female|여성|여자|x-ism|x-kob|x-koc/i;
const MALE = /injoon|hyunsu|minsang|minsu|bongjin|gookmin|youngjin|kyungsoo|\bmale|남성|남자|x-kod/i;
const NICE = /natural|premium|enhanced|neural|google|siri/i;

export function voiceGender(v) {
  const s = `${v?.name ?? ''} ${v?.voiceURI ?? ''}`;
  if (FEMALE.test(s)) return 'f';
  if (MALE.test(s)) return 'm';
  return null;
}

export function listVoices(lang = 'ko') {
  try {
    if (!synth) return [];
    const all = synth.getVoices();
    const pref = all.filter((v) => v.lang.toLowerCase().startsWith(lang));
    // 자연스러운(Natural·Google·Siri) 음성을 앞에 두되 순서는 안정적으로
    return (pref.length ? pref : all).slice().sort((a, b) => Number(NICE.test(b.name)) - Number(NICE.test(a.name)));
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

function findVoice(idOrName) {
  if (!idOrName) return undefined;
  return allVoices().find((x) => x.voiceURI === idOrName || x.name === idOrName);
}

// 페르소나에 맞는 기기 음성 고르기: 사용자가 지정한 여성/남성 기본 음성 → 성별이 맞는 음성 → 성별 모를 음성 → 아무 음성
function pickVoiceFor(p, lang, opts = {}) {
  const voices = listVoices(lang);
  if (!voices.length) return { voice: undefined, matched: false };
  const override = findVoice(p.gender === 'm' ? opts.male : opts.female);
  if (override) return { voice: override, matched: true };
  const same = voices.filter((v) => voiceGender(v) === p.gender);
  if (same.length) return { voice: same[p.pick % same.length], matched: true };
  const unknown = voices.filter((v) => !voiceGender(v));
  const pool = unknown.length ? unknown : voices;
  return { voice: pool[p.pick % pool.length], matched: false };
}

// 재생에 쓸 음성 결정: 페르소나 id(또는 예전 별칭) 또는 'browser:<voiceURI>'
// opts.female / opts.male: 설정에서 사용자가 지정한 기본 여성·남성 음성(voiceURI)
export function resolveVoice(choice, lang = 'ko', opts = {}) {
  if (choice && choice.startsWith('browser:')) {
    const uri = choice.slice(8);
    const v = findVoice(uri);
    return { voice: v ?? listVoices(lang)[0], rate: 1, pitch: 1, volume: 1, label: v?.name ?? choice, matched: true };
  }
  const p = PRESET[choice] ?? byId[DEFAULT_VOICE];
  const { voice, matched } = pickVoiceFor(p, lang, opts);
  // 성별이 맞는 음성이 없으면(예: 기기에 여성 음성만) 높낮이를 더 벌려 흉내 낸다
  const pitch = matched ? p.pitch : p.gender === 'm' ? Math.min(p.pitch, 0.72) : Math.max(p.pitch, 1.1);
  return { voice, rate: p.rate, pitch, volume: p.volume ?? 1, label: p.name, matched };
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
