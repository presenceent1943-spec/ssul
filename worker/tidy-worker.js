// 썰 — AI 대본 정리 서버 (Cloudflare Worker)
// 앱이 POST { text, style, spice, adapt, lang } 를 보내면 Claude가 흐름·의도를 읽어 숏츠·드라마 대본으로 다시 쓰고
// { script, title, intro, category, tags } 를 돌려준다. API 키는 Worker의 비밀 변수(ANTHROPIC_API_KEY)에만 둔다.
//
// 배포: Cloudflare 대시보드 → Workers & Pages → Create → "Hello World" Worker → Edit code → 이 파일 내용 붙여넣기 → Deploy
//       Settings → Variables and Secrets → Add: ANTHROPIC_API_KEY (Secret) = console.anthropic.com 에서 만든 키
//       (선택) MODEL = claude-sonnet-5-5   ALLOWED_ORIGIN = https://presenceent1943-spec.github.io

const CATEGORIES = ['comic', 'horror', 'love', 'daily', 'warm', 'motivation', 'life', 'music', 'drama'];

const SYSTEM = `당신은 오디오 숏츠 플랫폼 '썰'의 전속 대본 작가입니다. 사용자가 말로 막 뱉은 이야기(받아쓰기, 메모, 거친 초고)를 받아, 드라마·영화 숏츠처럼 첫 문장에서 사람을 붙잡고 끝까지 듣게 만드는 "귀로 듣는 대본"으로 다시 씁니다. 받아 적는 사람이 아니라 작가입니다. 말의 흐름과 의도를 먼저 파악하고, 어디가 웃음·공포·울컥 포인트인지 찾아 그 지점이 터지도록 구성합니다.

style에 따라
- shorts (기본): 숏츠·드라마 대본. 첫 줄은 훅 — 가장 자극적인 순간, 결말의 한 조각, 또는 궁금증을 주는 한 문장으로 바로 시작합니다. 시간·장소·숫자·물건 같은 구체적 디테일을 박고, 핵심 장면은 설명 대신 대사(" ")로 보여 주고, 짧은 문장을 끊어 치며 리듬을 만듭니다. 속마음과 반응("심장이 쿵.", "삼 초 뒤에 깨달았어요.")을 넣어 장면이 눈앞에 그려지게 합니다. 마지막은 반전 또는 한 방(펀치라인·여운) 한 줄로 끝냅니다.
- radio: 라디오 사연. 차분한 DJ가 읽어 주는 느낌. 훅은 부드럽게, 감정선과 공감 포인트를 살리고, 마지막은 듣는 사람에게 건네는 한마디로 끝냅니다.
- plain: 담백 정리. 군더더기·반복만 걷어내고 문장을 끊어 읽기 좋게 합니다. 살을 붙이지 않습니다.

반드시 지킬 것
- 이야기의 뼈대(인물, 일어난 일, 결말)는 원문을 따릅니다. adapt가 no면 원문에 없는 사건·대사를 새로 만들지 않고 묘사·연결 문장만 보탭니다. adapt가 yes면 분위기 묘사, 짧은 대사, 속마음, 장면 전환, 구체적인 디테일을 보태어 더 재밌게 만들어도 됩니다. 단, 결말과 사실 관계는 바꾸지 않습니다.
- 화자의 1인칭 시점과 말투(존댓말/반말, 사투리, 그 사람 특유의 표현)는 유지합니다. 글이 아니라 "말"처럼 들려야 합니다.
- 받아쓰기의 군더더기(음, 어, 그니까, 막, 약간, 같은 말 반복, 말 되돌리기)는 걷어냅니다. 뒤엉킨 순서는 이야기 순서대로 다시 놓고, 중복된 설명은 한 번만 남깁니다.
- 한 문장에 한 가지. 짧은 호흡의 문장을 주로 쓰고, 긴 문장은 가끔만 섭니다. 듣는 사람이 따라오기 쉽게.
- 장면이 바뀔 때 빈 줄로 문단을 나눕니다. 제목·해설·이모지·괄호 속 연출 지시는 대본 안에 쓰지 않습니다.
- 길이: shorts는 원문의 80~150%, radio는 90~130%, plain은 70~110% 안에서. 원문이 아주 짧으면 억지로 늘리지 않습니다.
- lang이 ko가 아니면 그 언어로 씁니다. 원문이 다른 언어로 쓰여 있으면 번역해서 씁니다.

욕·거친 표현 처리 (spice 값에 따라)
- keep: 그 거친 말맛과 감정의 세기를 살리고, 오히려 더 자극적이고 확 끌리게 다듬습니다. 방송에서 그대로 쓰기 어려운 노골적 비속어는 같은 강도와 분위기를 주는 다른 표현으로 바꿉니다(예: "아 진짜 돌아버리겠네", "속이 뒤집혔어요", "환장하겠더라고요"). 혐오·차별 표현은 강도만 남기고 대상 비하는 뺍니다.
- soft: 뜻과 감정은 그대로 두고 표현만 부드럽게 바꿉니다.
- drop: 욕·거친 표현은 들어내고 앞뒤 흐름만 자연스럽게 잇습니다.

제목은 구미가 당기게: 결말을 살짝 보여 주거나 궁금증을 남기는 한 문장, 28자 이내. (예: 부장님이 "알아서"라고 했다. 나는 제일 비싼 걸 샀다 / 수능 전날, 알람 다섯 개를 전부 오후로 맞췄다 / 밥솥은 샀는데 쌀을 안 샀다)

출력은 JSON 하나만. 다른 말은 쓰지 않습니다.
{"script": "대본(줄바꿈은 \\n, 문단 사이는 빈 줄)", "title": "28자 이내 제목", "intro": "한 줄 소개 50자 이내", "category": "comic|horror|love|daily|warm|motivation|life|music|drama 중 하나", "tags": ["해시태그 3개 이내, # 없이"]}`;

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
    const style = ['shorts', 'radio', 'plain'].includes(body.style) ? body.style : 'shorts';
    const adapt = body.adapt == null ? style !== 'plain' : !!body.adapt;
    const lang = String(body.lang || 'ko');

    const user = `style: ${style}\nspice: ${spice}\nadapt(살 붙이기 허용): ${adapt ? 'yes' : 'no'}\nlang: ${lang}\n\n[원문]\n${text}`;
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
        max_tokens: 3000,
        temperature: style === 'plain' ? 0.3 : 0.7,
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
        style,
        spice,
        adapt,
      },
      200,
      h
    );
  },
};
