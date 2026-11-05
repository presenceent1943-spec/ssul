import { useEffect, useState } from 'react';
import { useT } from './store.jsx';
import { Button, Icon, Logo } from './ui.jsx';

function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function isIOS() {
  try {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch {
    return false;
  }
}

const KEY = 'ssul.install.dismissed';

// 홈 화면 설치 안내: 안드로이드·데스크톱은 설치 버튼, 아이폰은 공유 → 홈 화면에 추가 안내
export function InstallBanner() {
  const t = useT();
  const [prompt, setPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return isStandalone() || localStorage.getItem(KEY) === '1';
    } catch {
      return isStandalone();
    }
  });
  const [ios] = useState(isIOS);
  useEffect(() => {
    const h = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', h);
    const done = () => setHidden(true);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', h);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  if (hidden) return null;
  if (!prompt && !ios) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
  };
  return (
    <div className="install" role="region" aria-label={t('앱으로 설치')}>
      <Logo size={36} />
      <div className="install-text">
        <strong>{t('앱으로 설치')}</strong>
        <span className="small">{prompt ? t('홈 화면에 설치하면 전체 화면으로 바로 열려요') : t('아이폰: 아래 공유 버튼 → ‘홈 화면에 추가’')}</span>
      </div>
      {prompt ? (
        <Button
          variant="primary"
          size="sm"
          onClick={async () => {
            try {
              prompt.prompt();
              const r = await prompt.userChoice;
              if (r?.outcome === 'accepted') setHidden(true);
            } catch {}
            setPrompt(null);
          }}
        >
          {t('설치')}
        </Button>
      ) : (
        <Icon name="share" size={22} />
      )}
      <button type="button" className="icon-btn install-x" onClick={dismiss} aria-label={t('닫기')}>
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
