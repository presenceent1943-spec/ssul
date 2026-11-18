// 샘플 작품 음성 생성용 매니페스트: 작품별로 화자 턴(연속된 같은 화자 줄 묶음)과 문장 목록을 뽑는다.
// 사용: node scripts/tts-manifest.mjs > /tmp/manifest.json
import { readFileSync } from 'node:fs';
import { parseScript, speakerOf, splitSentences } from '../src/util.js';

const src = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');
const works = [];
let cur = null;
for (const line of src.split('\n')) {
  const m = line.match(/^\s*id: `(w-[^`]+)`,\s*$/);
  if (m) {
    cur = { id: m[1] };
    works.push(cur);
    continue;
  }
  if (/^export const SERIES/.test(line)) break;
  if (!cur) continue;
  const v = line.match(/^\s*aiVoiceName: `([^`]+)`/);
  if (v) cur.narrator = v[1];
  const c = line.match(/^\s*cast: \{ (.*) \},\s*$/);
  if (c) cur.cast = Object.fromEntries(c[1].split(', ').map((kv) => kv.split(': ').map((x) => x.replace(/'/g, ''))));
  const s = line.match(/^\s*script: `(.*)`\s*$/);
  if (s) cur.script = s[1].replace(/\\n/g, '\n');
}

const out = [];
for (const w of works) {
  const { sentences } = parseScript(w.script);
  const turns = [];
  let si = 0;
  for (const raw of w.script.split('\n')) {
    const sp = speakerOf(raw);
    const who = sp ? sp.name : null;
    const text = sp ? sp.text : raw;
    const n = splitSentences(text).length;
    const idx = [];
    for (let k = 0; k < n; k++) idx.push(si++);
    const last = turns[turns.length - 1];
    if (last && last.speaker === who) {
      last.text += (text.trim() ? '\n' : '\n') + text;
      last.idx.push(...idx);
    } else turns.push({ speaker: who, persona: who ? w.cast[who] : w.narrator, text, idx });
  }
  for (const t of turns) t.text = t.text.replace(/\n{3,}/g, '\n\n').trim();
  out.push({ id: w.id, narrator: w.narrator, cast: w.cast ?? {}, sentences, turns: turns.filter((t) => t.text) });
}
console.log(JSON.stringify(out, null, 1));
