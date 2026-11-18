import { useT } from '../store.jsx';
import { Feed } from './feed.jsx';

// 30초 썰: 1분 안에 끝나는 이야기만 모은 세로 피드
export function Shorts({ startId }) {
  const t = useT();
  return <Feed only="short" startId={startId} title={t('30초 썰')} backable />;
}
