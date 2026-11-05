// 썰 — AI 대본 정리 서버 (Cloudflare Worker)
// 앱이 POST { text, spice, adapt, lang } 를 보내면 Claude가 흐름·의도를 읽어 대본으로 고쳐 쓰고
// { script, title, intro, category, tags } 를 돌려준다. API 키는 Worker의 비밀 변수(ANTHROPIC_API_KEY)에만 둔다.
//
// 배포: Cloudflare 대시보드 → Workers & Pages → Create → "Hello World" Worker → Edit code → 이 파일 내용 붙여넣기 → Deploy
//       Settings → Variables and Secrets → Add: ANTHROPIC_API_KEY (Secret) = console.anthropic.com 에서 만든 키
//       (선택) MODEL = claude-sonnet-5-5   ALLOWED_ORIGIN = https://presenceent1943-spec.github.io

const CATEGORIES = ['comic', 'horror', 'love', 'daily', 'warm', 'motivation', 'life', 'music', 'drama'];

const SYSTEM = `당신은 오디오 이야기 플랫폼 '썰'의 대본 편집자입니다. 사용자가 말로 받아쓴 글이나 거친 초고를 주면, 말의 흐름과 의도를 파악해서 "귀로 들었을 때" 좋은 대본으로 고쳐 씁니다.

반드시 지킬 것
- 원문에 없는 사실·사건·인물·대사를 지어내지 않습니다. (각색 허용이 켜진 경우에만 분위기 묘사·연결 문장을 보탤 수 있고, 사실 관계는 그대로 둡니다.)
- 화자의 1인칭 시점과 말투(존댓말/반말, 사투리)는 유지합니다. 구어체를 살립니다.
- 받아쓰기 특유의 군더더기(음, 어, 그니까, 막, 약간, 같은 말 반복, 말 되돌리기)는 걷어냅니다.
- 순서가 뒤엉킨 부분은 이야기 순서대로 재배치합니다. 중복된 설명은 한 번만 남깁니다.
- 문장은 짧게, 호흡 단위로. 한 문장에 한 가지만. 듣는 사람이 따라오기 쉽게.
- 도입은 바로 상황으로 들어가고, 핵심·반전·마지막 한 방은 끝에 힘 있게 둡니다.
- 3~5문장마다 줄을 바꿔 문단을 나눕니다. 제목·머리말·해설·이모지는 넣지 않습니다.
- 길이는 원문의 70~120% 안에서. 짧은 글을 억지로 늘리지 않습니다.

욕·거친 표현 처리 (spice 값에 따라)
- keep: 그 거친 말맛과 감정의 세기를 살리고, 오히려 더 자극적이고 확 끌리게 다듬습니다. 방송에서 그대로 쓰기 어려운 노골적 비속어는 같은 강도와 분위기를 주는 다른 표현으로 바꿉니다(예: "아 진짜 돌아버리겠네", "속이 뒤집혔어요", "환장하겠더라고요"). 혐오·차별 표현은 강도만 남기고 대상 비하는 뺍니다.
- soft: 뜻과 감정은 그대로 두고 표현만 부드럽게 바꿉니다.
- drop: 욕·거친 표현은 들어내고 앞뒤 흐름만 자연스럽게 잇습니다.

출력은 JSON 하나만. 다른 말은 쓰지 않습니다.
{"script": "정리한 대본(줄바꿈은 \\n)", "title": "24자 이내 제목", "intro": "한 줄 소개 50자 이내", "category": "comic|horror|love|daily|warm|motivation|life|music|drama 중 하나", "tags": ["해시태그 3개 이내, # 없이"]}`;

function cors(origin, env) {
  const allow = env.ALLOWED_ORIGIN || '*';
  return {
    'access-control-allow-origin': allow === '*' ? '*' : origin === allow ? allow : allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const h = cors(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method === 'GET') return json({ ok: true, service: 'ssul-tidy' }, 200, h);
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'no-key', message: 'ANTHROPIC_API_KEY 비밀 변수를 설정하세요.' }, 500, h);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad-json' }, 400, h);
    }
    const text = String(body.text || '').trim();
    if (text.length < 10) return json({ error: 'too-short' }, 400, h);
    if (text.length > 6000) return json({ error: 'too-long', message: '6,000자까지만 정리할 수 있어요.' }, 400, h);
    const spice = ['keep', 'soft', 'drop'].includes(body.spice) ? body.spice : 'keep';
    const adapt = !!body.adapt;
    const lang = String(body.lang || 'ko');

    const user = `spice: ${spice}\nadapt(각색 허용): ${adapt ? 'yes' : 'no'}\nlang: ${lang}\n\n[원문]\n${text}`;
    const model = env.MODEL || 'claude-sonnet-5-5';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2500,
        temperature: 0.4,
        system: SYSTEM,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return json({ error: 'upstream', status: r.status, detail: t.slice(0, 300) }, 502, h);
    }
    const data = await r.json();
    const raw = (data.content || []).map((c) => c.text || '').join('');
    let out;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      out = JSON.parse(m ? m[0] : raw);
    } catch {
      return json({ error: 'parse', raw: raw.slice(0, 500) }, 502, h);
    }
    const script = String(out.script || '').trim();
    if (!script) return json({ error: 'empty' }, 502, h);
    return json(
      {
        script,
        title: String(out.title || '').slice(0, 40),
        intro: String(out.intro || '').slice(0, 80),
        category: CATEGORIES.includes(out.category) ? out.category : undefined,
        tags: Array.isArray(out.tags) ? out.tags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean).slice(0, 3) : [],
        model,
        spice,
        adapt,
      },
      200,
      h
    );
  },
};
