# assets/cover-urls.txt 의 이미지를 받아 site/covers/<id>.jpg (900px, JPEG) 로 저장
import sys, os, io, urllib.request
from PIL import Image

src = sys.argv[1] if len(sys.argv) > 1 else 'assets/cover-urls.txt'
out = sys.argv[2] if len(sys.argv) > 2 else 'site/covers'
os.makedirs(out, exist_ok=True)
ok = fail = 0
for line in open(src, encoding='utf-8'):
    line = line.strip()
    if not line:
        continue
    wid, url = line.split(None, 1)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (ssul cover fetch)'})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        im = Image.open(io.BytesIO(data)).convert('RGB')
        im.thumbnail((900, 900), Image.LANCZOS)
        im.save(os.path.join(out, f'{wid}.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
        print('ok', wid, im.size, len(data))
        ok += 1
    except Exception as e:
        print('FAIL', wid, repr(e))
        fail += 1
print(f'done ok={ok} fail={fail}')
sys.exit(0 if ok > 0 else 1)
