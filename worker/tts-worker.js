// 썰 — 음성 생성 서버 (Cloudflare Worker)
// 앱이 POST { lines: [{ text, persona }], lang } 를 보내면 문장마다 페르소나(연령·성별)에 맞는 신경망 음성으로 읽어
// 한 개의 MP3로 이어 붙이고, 문장별 시작·끝 시간(cues)을 함께 돌려준다. 앱은 이 파일을 그대로 재생한다.
//
// 제공자: Microsoft Azure Speech (한국어 신경망 음성 9종, 월 50만 자 무료 구간 → 이후 100만 자당 약 16달러)
// 배포: Cloudflare 대시보드 → Workers & Pages → Create → "Hello World" Worker → 이름 ssul-tts → Edit code → 이 파일 붙여넣기 → Deploy
//       Settings → Variables and Secrets →
//         AZURE_SPEECH_KEY (Secret) = Azure Portal → Speech 리소스 → Keys
//         AZURE_REGION = koreacentral (리소스 만든 지역)
//         (선택) ALLOWED_ORIGIN = https://presenceent1943-spec.github.io
//         (선택) VOICES = 아래 VOICE_MAP 과 같은 모양의 JSON (음성 이름을 바꾸고 싶을 때)
// 앱: 관리자 화면 → 운영 설정 → 음성 생성 서버 주소 에 Worker 주소 입력 (기본값은 src/store.jsx 의 ttsUrl)

const PERSONAS = ['w20', 'w30', 'w50', 'w70', 'kid', 'whisper', 'm20', 'm30', 'm50', 'm70'];

// 페르소나 → Azure 음성 + 억양 조절. rate/pitch 는 SSML prosody 값.
const VOICE_MAP = {
  w20: { name: 'ko-KR-SeoHyeonNeural', rate: '+4%', pitch: '+6%' },
  w30: { name: 'ko-KR-SunHiNeural', rate: '0%', pitch: '0%' },
  w50: { name: 'ko-KR-SoonBokNeural', rate: '-6%', pitch: '-4%' },
  w70: { name: 'ko-KR-SoonBokNeural', rate: '-18%', pitch: '-10%' },
  kid: { name: 'ko-KR-JiMinNeural', rate: '+6%', pitch: '+18%' },
  whisper: { name: 'ko-KR-SunHiNeural', rate: '-14%', pitch: '-2%', volume: '-30%' },
  m20: { name: 'ko-KR-HyunsuNeural', rate: '+6%', pitch: '+4%' },
  m30: { name: 'ko-KR-InJoonNeural', rate: '0%', pitch: '0%' },
  m50: { name: 'ko-KR-GookMinNeural', rate: '-6%', pitch: '-8%' },
  m70: { name: 'ko-KR-BongJinNeural', rate: '-16%', pitch: '-12%' },
};

function cors(origin, env) {
  const allow = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': allow === '*' ? '*' : allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function ssml(text, v, lang) {
  const vol = v.volume ? ` volume="${v.volume}"` : '';
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${v.name}"><prosody rate="${v.rate}" pitch="${v.pitch}"${vol}>${esc(text)}</prosody><break time="350ms"/></voice></speak>`;
}

// MP3 프레임을 세어 길이(초)를 구하고, 앞의 ID3 태그는 떼어 낸다 (이어 붙이기용)
function mp3Info(bytes) {
  let i = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    i = 10 + size;
  }
  const start = i;
  const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  let dur = 0;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const ver = (bytes[i + 1] >> 3) & 3;
    const layer = (bytes[i + 1] >> 1) & 3;
    const brIdx = bytes[i + 2] >> 4;
    const srIdx = (bytes[i + 2] >> 2) & 3;
    const pad = (bytes[i + 2] >> 1) & 1;
    if (layer !== 1 || ver === 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const mpeg1 = ver === 3;
    const br = (mpeg1 ? BR1 : BR2)[brIdx] * 1000;
    const sr = SR[ver][srIdx];
    const spf = mpeg1 ? 1152 : 576;
    const len = Math.floor(((spf / 8) * br) / sr) + pad;
    dur += spf / sr;
    i += len;
  }
  return { duration: dur, body: bytes.subarray(start) };
}

function b64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const h = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'GET') return json({ ok: true, service: 'ssul-tts', personas: PERSONAS }, 200, h);
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    if (!env.AZURE_SPEECH_KEY || !env.AZURE_REGION) return json({ error: 'no-key', message: 'AZURE_SPEECH_KEY, AZURE_REGION 변수를 설정하세요.' }, 500, h);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad-json' }, 400, h);
    }
    const lines = Array.isArray(body.lines) ? body.lines.map((l) => ({ text: String(l?.text || '').trim(), persona: PERSONAS.includes(l?.persona) ? l.persona : 'w30' })).filter((l) => l.text) : [];
    if (!lines.length) return json({ error: 'empty' }, 400, h);
    const total = lines.reduce((a, l) => a + l.text.length, 0);
    if (total > 6000) return json({ error: 'too-long', message: '6,000자까지만 만들 수 있어요.' }, 400, h);
    const lang = /^[a-z]{2}-[A-Z]{2}$/.test(body.lang || '') ? body.lang : 'ko-KR';
    let voices = VOICE_MAP;
    if (env.VOICES) {
      try {
        voices = { ...VOICE_MAP, ...JSON.parse(env.VOICES) };
      } catch {}
    }

    const endpoint = `https://${env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
    const parts = [];
    const cues = [];
    let t = 0;
    // 문장을 4개씩 병렬로 요청 (제공자 동시 요청 제한 고려)
    for (let i = 0; i < lines.length; i += 4) {
      const group = lines.slice(i, i + 4);
      const res = await Promise.all(
        group.map((l) =>
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
              'content-type': 'application/ssml+xml',
              'x-microsoft-outputformat': 'audio-24khz-48kbitrate-mono-mp3',
              'user-agent': 'ssul-tts',
            },
            body: ssml(l.text, voices[l.persona] || VOICE_MAP.w30, lang),
          })
        )
      );
      for (const r of res) {
        if (!r.ok) {
          const msg = await r.text();
          return json({ error: 'upstream', status: r.status, detail: msg.slice(0, 300) }, 502, h);
        }
        const info = mp3Info(new Uint8Array(await r.arrayBuffer()));
        cues.push([Math.round(t * 100) / 100, Math.round((t + info.duration) * 100) / 100]);
        t += info.duration;
        parts.push(info.body);
      }
    }
    const size = parts.reduce((a, p) => a + p.length, 0);
    const all = new Uint8Array(size);
    let off = 0;
    for (const p of parts) {
      all.set(p, off);
      off += p.length;
    }
    return json({ audio: b64(all), mime: 'audio/mpeg', duration: Math.round(t * 100) / 100, cues, lines: lines.length }, 200, h);
  },
};
