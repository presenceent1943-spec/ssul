import json, subprocess, os, re, sys, shutil
import numpy as np

W = json.load(open('assemble.json'))
os.makedirs('clips', exist_ok=True)
os.makedirs('out', exist_ok=True)
SR = 24000
GAP = 0.35  # 턴 사이 쉼(초)

def sh(*a):
    return subprocess.run(a, capture_output=True)

def dl(i, url):
    p = f'clips/{i}.mp3'
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        subprocess.run(['curl', '-sS', '-o', p, url], check=True)
    return p

def pcm(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32)

def trim_silence(x, thr=0.004, keep=0.08):
    # 앞뒤 무음 다듬기 (살짝만 남김)
    a = np.abs(x) / 32768.0
    idx = np.where(a > thr)[0]
    if len(idx) == 0:
        return x
    s = max(0, idx[0] - int(keep * SR))
    e = min(len(x), idx[-1] + int(keep * SR))
    return x[s:e]

NORM = re.compile(r'[^0-9A-Za-z가-힣]')
def norm(s):
    return NORM.sub('', s)

from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')

def align(path, sentences, dur):
    """클립 안에서 문장별 [시작, 끝] (초). whisper 단어 시각 + 글자 수 비례로 맞춘다."""
    targets = [len(norm(s)) for s in sentences]
    total_chars = sum(targets)
    if len(sentences) == 1 or total_chars == 0:
        return [[0.0, dur]]
    words = []
    try:
        segs, _ = model.transcribe(path, language='ko', word_timestamps=True, beam_size=3)
        for sg in segs:
            for w in sg.words or []:
                n = len(norm(w.word))
                if n:
                    words.append((w.start, w.end, n))
    except Exception as e:
        print('whisper fail', path, e, file=sys.stderr)
    if not words:
        # 글자 수 비례
        cues, t = [], 0.0
        for n in targets:
            d = dur * n / total_chars
            cues.append([t, t + d]); t += d
        return cues
    tchars = sum(n for _, _, n in words)
    ratio = tchars / total_chars
    # 누적 글자 → 시간 함수
    cum = []
    c = 0
    for s, e, n in words:
        cum.append((c, c + n, s, e))
        c += n
    def t_at(cc):
        cc = min(max(cc, 0), c)
        for c0, c1, s, e in cum:
            if cc <= c1:
                f = (cc - c0) / max(1, (c1 - c0))
                return s + (e - s) * f
        return cum[-1][3]
    cues, acc = [], 0
    bounds = [0.0]
    for n in targets[:-1]:
        acc += n
        bounds.append(t_at(acc * ratio))
    bounds.append(dur)
    # 단조 증가 보장
    for i in range(1, len(bounds)):
        if bounds[i] < bounds[i - 1] + 0.05:
            bounds[i] = bounds[i - 1] + 0.05
    for i in range(len(targets)):
        cues.append([bounds[i], bounds[i + 1]])
    return cues

result = {}
for w in W:
    pieces = []
    cues = [None] * w['nsent']
    t = 0.0
    for k, clip in enumerate(w['clips']):
        p = dl(clip['i'], clip['url'])
        x = trim_silence(pcm(p))
        dur = len(x) / SR
        # 클립 안 문장 정렬
        sents = [w['sentences'][i] for i in clip['idx']]
        # 정렬은 다듬은 wav 기준으로 — 임시 파일
        tmp = f'clips/{clip["i"]}_t.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-i', '-', tmp], input=x.astype(np.int16).tobytes(), check=True)
        cc = align(tmp, sents, dur)
        for j, i in enumerate(clip['idx']):
            cues[i] = [round(t + cc[j][0], 2), round(t + cc[j][1], 2)]
        pieces.append(x)
        t += dur
        if k < len(w['clips']) - 1:
            gap = np.zeros(int(GAP * SR), np.float32)
            pieces.append(gap)
            t += GAP
    # 빠진 문장(없어야 함) 보정
    for i in range(len(cues)):
        if cues[i] is None:
            prev = cues[i - 1][1] if i else 0.0
            cues[i] = [prev, prev + 0.5]
    audio = np.concatenate(pieces)
    # 음량 정규화 (피크 -1 dBFS)
    peak = np.max(np.abs(audio)) or 1.0
    audio = audio * (32768 * 0.89 / peak)
    out = f'out/{w["id"]}.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '48k', out], input=audio.astype(np.int16).tobytes(), check=True)
    dur_total = round(len(audio) / SR, 2)
    cues[-1][1] = dur_total
    result[w['id']] = {'duration': dur_total, 'cues': cues}
    print(w['id'], 'clips', len(w['clips']), 'sent', w['nsent'], 'dur', dur_total, 'size', os.path.getsize(out))

json.dump(result, open('out/cues.json', 'w'), ensure_ascii=False)
print('done')
