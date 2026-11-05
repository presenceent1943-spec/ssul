// 대본 정리 — 기본(규칙) 정리와 AI 정리
// 기본 정리: 받아쓰기처럼 마침표가 없는 글을 문장 단위로 끊고, 군더더기와 반복을 걷어낸다.
// AI 정리: 서버(워커)가 흐름·의도를 읽어 대본으로 고쳐 쓴다. 서버 주소는 운영 설정(tidyUrl)에 둔다.

const ENDINGS =
  '(습니다|합니다|됩니다|입니다|였습니다|었습니다|았습니다|겠습니다|습니까|거든요|잖아요|더라고요|더라구요|더군요|던데요|네요|데요|고요|구요|죠|거예요|거에요|게요|을게요|ㄹ게요|세요|셨어요|어요|아요|에요|예요|했어요|였어요|었어요|았어요|해요|래요|대요|냐고요|라고요|다고요|니까요|는데요|은데요|ㄴ데요|할게요|볼게요|드릴게요|주세요|했거든요|이었거든요|였거든요|있어요|없어요|같아요|싶어요|했죠|였죠|이죠|거죠|했는데요|했잖아요|했네요|있었어요|없었어요)';

const FILLERS_LEAD = /(^|[\s,])(음+|어+|그+|저기요?|있잖아요?|그니까|그러니까|그래가지고|그래서\s+그래서|막|뭐랄까|뭐지|약간|좀|이제|뭐)(?=[\s,])/g;

function collapseRepeats(t) {
  // "진짜 진짜 진짜" → "진짜", "그 그 그" → "그"
  return t.replace(/(^|\s)(\S{1,4})(?:\s+\2)+(?=\s|$)/g, '$1$2');
}

function splitSentencesKo(t) {
  // 문장 부호가 거의 없으면(받아쓰기) 어미 뒤에서 끊는다
  const punct = (t.match(/[.!?…]/g) || []).length;
  const words = t.split(/\s+/).length;
  if (words < 8 || punct >= words / 12) return t;
  const re = new RegExp(`(${ENDINGS})(?=\\s+[^\\s.!?…])`, 'g');
  return t.replace(re, (m) => m + '.');
}

function fixPunct(t) {
  return t
    .replace(/\r\n?/g, '\n')
    .replace(/\.{3,}/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .replace(/\s+([,.!?…])/g, '$1')
    .replace(/([!?]){2,}/g, '$1')
    .replace(/\.{2}/g, '.')
    .replace(/([,.!?…])(?=[^\s\n"'’”)\]])/g, '$1 ');
}

function endSentences(t) {
  return t
    .split('\n')
    .map((l) => {
      const s = l.trim();
      if (!s) return '';
      return /[.!?…"”’)]$/.test(s) ? s : s + '.';
    })
    .filter(Boolean)
    .join('\n');
}

function paragraphs(t, per = 4) {
  // 한 줄에 문장이 길게 이어지면 3~4문장마다 줄을 바꾼다
  const out = [];
  for (const line of t.split('\n')) {
    const parts = line.match(/[^.!?…]+[.!?…]+["”’)]?/g);
    if (!parts || parts.length <= per) {
      out.push(line);
      continue;
    }
    for (let i = 0; i < parts.length; i += per) out.push(parts.slice(i, i + per).map((x) => x.trim()).join(' '));
  }
  return out.join('\n');
}

export function localTidy(raw) {
  let t = raw.normalize('NFC');
  t = fixPunct(t);
  t = t.replace(FILLERS_LEAD, '$1');
  t = t.replace(/\s{2,}/g, ' ');
  t = collapseRepeats(t);
  t = splitSentencesKo(t);
  t = fixPunct(t);
  t = endSentences(t);
  t = paragraphs(t);
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

// 욕·거친 표현 처리 — keep: 분위기 살려 더 세게 / soft: 순화 / drop: 삭제
export const SPICE = [
  { id: 'keep', name: '살려서 세게', desc: '거친 말맛은 유지하고 더 자극적으로. 못 쓰는 말은 같은 강도의 다른 말로' },
  { id: 'soft', name: '순화', desc: '뜻은 두고 표현만 부드럽게' },
  { id: 'drop', name: '빼기', desc: '욕·거친 표현은 들어내고 흐름만 잇기' },
];

export async function remoteTidy(url, payload, { timeoutMs = 40000 } = {}) {
  const ctl = new AbortController();
  const h = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j || typeof j.script !== 'string' || !j.script.trim()) throw new Error('empty');
    return j;
  } finally {
    clearTimeout(h);
  }
}
