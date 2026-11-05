// 문장 분리·길이 추정·텍스트 정리 등 순수 유틸
export function splitSentences(text) {
  const out = [];
  const re = /[^.!?…\n]+[.!?…]*/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s) out.push(s);
  }
  return out;
}

export function sentenceSec(s, cps = 4) {
  const n = s.replace(/\s+/g, ' ').trim().length;
  return Math.max(1, Math.round(n / cps));
}

export function totalSec(sentences, cps = 4) {
  return sentences.reduce((a, s) => a + sentenceSec(s, cps), 0);
}

export function timeline(sentences, cps = 4) {
  let t = 0;
  return sentences.map((s) => {
    const d = sentenceSec(s, cps);
    const r = { start: t, end: t + d };
    t += d;
    return r;
  });
}

export function idxAt(tl, time) {
  if (tl.length === 0) return 0;
  for (let i = 0; i < tl.length; i++) if (time < tl[i].end) return i;
  return tl.length - 1;
}

export function clock(sec) {
  const t = Math.max(0, Math.floor(sec));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function normTag(s) {
  return s.normalize('NFC').trim().replace(/^#+/, '').replace(/\s+/g, '').toLowerCase();
}

export function cleanScript(text) {
  let t = text.normalize('NFC');
  t = t.replace(/\r\n?/g, '\n');
  t = t.replace(/\.{3,}/g, '…');
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/ *\n+ */g, '\n');
  t = t.replace(/\s+([,.!?…])/g, '$1');
  t = t.replace(/([!?]){2,}/g, '$1');
  t = t.replace(/\.{2}/g, '.');
  t = t.replace(/([,.!?…])(?=[^\s\n"'’”)\]])/g, '$1 ');
  t = t
    .split('\n')
    .map((l) => {
      const s = l.trim();
      return s ? (/[.!?…"”’)]$/.test(s) ? s : s + '.') : '';
    })
    .filter(Boolean)
    .join('\n');
  return t.trim();
}

export function findPII(text) {
  const out = [];
  const chk = (kind, re) => {
    const m = text.match(re);
    if (m) out.push({ kind, sample: m[0] });
  };
  chk('전화번호', /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/);
  chk('이메일', /[\w.+-]+@[\w-]+\.[\w.]+/);
  chk('주민번호 형식', /\d{6}[-\s]?[1-4]\d{6}/);
  chk('상세 주소', /\d+동\s?\d+호/);
  return out;
}

const CAT_HINTS = {
  comic: ['웃', '황당', '실수', '흑역사', '빵 터', '창피', '망신', '개그', '어이없'],
  horror: ['무서', '귀신', '괴담', '소름', '기묘', '새벽 세 시', '발소리', '문 두드', '으스스', '공포'],
  love: ['짝사랑', '썸', '연애', '이별', '고백', '남자친구', '여자친구', '헤어', '좋아한다고'],
  daily: ['회사', '직장', '출근', '퇴근', '학교', '자취', '육아', '가족', '부장', '야근', '월급'],
  warm: ['고마', '감사', '위로', '따뜻', '울컥', '괜찮', '토닥', '엄마', '아빠', '할머니'],
  motivation: ['운동', '도전', '자신감', '시작', '포기', '헬스', '러닝', '달리', '오늘도', '할 수 있'],
  life: ['인생', '여행', '실패', '회복', '배운', '돌아보', '제주', '서른', '마흔', '그만두'],
  music: ['노래', '기타', '멜로디', '자작곡', '시 ', '낭독', '음악', '코드', '가사'],
  drama: ['등대', '왕국', '마법', '상황극', '판타지', '편지', '연재', '그녀는', '그는', '1화'],
};

export function guessCategory(text) {
  let best = 'daily';
  let n = 0;
  Object.keys(CAT_HINTS).forEach((k) => {
    const c = CAT_HINTS[k].reduce((a, w) => a + (text.includes(w) ? 1 : 0), 0);
    if (c > n) {
      best = k;
      n = c;
    }
  });
  return best;
}

const TAG_HINTS = [
  ['출근', '출근길'], ['퇴근', '퇴근길'], ['운동', '운동전'], ['자기 전', '자기전'], ['잠들', '자기전'],
  ['회사', '직장인'], ['부장', '직장인'], ['학교', '학교썰'], ['선생님', '학교썰'], ['연애', '연애썰'],
  ['고백', '연애썰'], ['반전', '반전'], ['새벽', '새벽감성'], ['인생', '인생이야기'], ['여행', '여행'],
  ['자취', '자취'], ['엄마', '가족'], ['아빠', '가족'],
];

export function suggestTags(text, sec, shortMax, max) {
  const out = [];
  for (const [w, tag] of TAG_HINTS) if (text.includes(w) && !out.includes(tag)) out.push(tag);
  if (sec <= shortMax && !out.includes('30초썰')) out.push('30초썰');
  return out.slice(0, max);
}

export function autoTitle(text) {
  const first = (splitSentences(text)[0] ?? '').replace(/[.!?…]+$/, '');
  return first.length > 24 ? first.slice(0, 24) + '…' : first;
}

export function uid(prefix) {
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${r}`;
}

export function toggleIn(arr, v) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

// 미리듣기 길이: 문장 경계에서 끊음
export function previewCutoff(sentences, ops) {
  const tl = timeline(sentences, ops.charsPerSec);
  let cut = 0;
  for (const seg of tl) {
    if (seg.end <= ops.previewMaxSec) cut = seg.end;
    else break;
  }
  return cut > 0 ? cut : Math.min(ops.previewMaxSec, totalSec(sentences, ops.charsPerSec));
}

export function previewSentenceCount(sentences, maxSec, cps) {
  let acc = 0;
  let n = 0;
  for (const s of sentences) {
    const d = sentenceSec(s, cps);
    if (acc + d > maxSec) break;
    acc += d;
    n++;
  }
  return n;
}

export function isPurchased(workId, purchases) {
  return purchases.some((p) => p.workId === workId);
}

export function canAccess(work, purchases, mine = false) {
  if (!work.paid || mine) return true;
  return isPurchased(work.id, purchases);
}

export function paidLengthOk(work, ops) {
  return totalSec(work.sentences, ops.charsPerSec) >= ops.paidMinSec;
}

export function subsOk(subs, ops) {
  return subs >= ops.paidEligibleSubs;
}

export function makePurchase(work, purchases, now = new Date()) {
  if (!work.paid) return { ok: false, duplicate: false, purchases, reason: 'free' };
  const dup = purchases.find((p) => p.workId === work.id);
  if (dup) return { ok: true, duplicate: true, purchase: dup, purchases };
  const p = {
    orderId: `demo-${now.getTime().toString(36)}-${work.id}`,
    workId: work.id,
    priceKRW: work.priceKRW ?? 0,
    at: now.toISOString(),
    mode: 'demo',
  };
  return { ok: true, duplicate: false, purchase: p, purchases: [...purchases, p] };
}

// 순위 계산
export const RANK_W = { listens: 1, completion: 2, saveShare: 0.8, likes: 0.4, shrinkM: 20 };

export function expectedCompletion(sec) {
  const v = 0.9 - 0.08 * Math.log2(Math.max(sec, 30) / 30);
  return Math.min(0.9, Math.max(0.35, v));
}

export function shrunkCompletion(st, m, prior = 0.5) {
  return (st.completions + m * prior) / (st.validListens + m);
}

export function rankScore(st, sec, w = RANK_W) {
  const comp = shrunkCompletion(st, w.shrinkM) / expectedCompletion(sec);
  return (
    w.listens * Math.log1p(st.validListens) +
    w.completion * comp +
    w.saveShare * Math.log1p(st.saves + st.shares) +
    w.likes * Math.log1p(st.likes)
  );
}

export function rankWorks(works, period, cps, w = RANK_W) {
  return works
    .filter((x) => x.status === 'published')
    .map((x) => ({ work: x, score: rankScore(x.stats[period], totalSec(x.sentences, cps), w) }))
    .sort((a, b) => b.score - a.score);
}

export function emptyStats() {
  return { validListens: 0, completions: 0, previewListens: 0, likes: 0, saves: 0, shares: 0, comments: 0, newSubscribers: 0, purchases: 0 };
}

export function workLink(id) {
  try {
    return `${location.origin}${location.pathname}#${id}`;
  } catch {
    return `#${id}`;
  }
}

export function searchAll(q, works, creators) {
  const n = normTag(q);
  if (!n) return { works: [], creators: [], tags: [] };
  const norm = (s) => s.normalize('NFC').toLowerCase().replace(/\s+/g, '');
  const needle = norm(n);
  const tagMap = new Map();
  for (const w of works) {
    if (w.status !== 'published') continue;
    for (const tg of w.tags) {
      const k = normTag(tg);
      if (k.includes(needle)) tagMap.set(k, (tagMap.get(k) ?? 0) + 1);
    }
  }
  const tags = [...tagMap.entries()].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return {
    works: works.filter(
      (w) => w.status === 'published' && (norm(w.title).includes(needle) || norm(w.intro).includes(needle) || w.tags.some((tg) => normTag(tg) === needle || normTag(tg).includes(needle)))
    ),
    creators: creators.filter((c) => norm(c.name).includes(needle) || norm(c.handle).includes(needle) || norm(c.intro).includes(needle)),
    tags,
  };
}

export function worksByTag(tag, works) {
  const n = normTag(tag);
  return works.filter((w) => w.status === 'published' && w.tags.some((t) => normTag(t) === n));
}

export function topTags(works, n = 12) {
  const m = new Map();
  works.forEach((w) => w.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

// 이미지 파일 → 작은 data URL (localStorage 보호)
export function fileToDataUrl(file, maxW = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}
