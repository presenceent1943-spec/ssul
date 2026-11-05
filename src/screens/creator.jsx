import { useRef, useState } from 'react';
import { CAT, SERIES } from '../data.js';
import { COVER_PRESETS, displayName, subscriberCount, useStore, useT } from '../store.jsx';
import { useApp } from '../app-ctx.js';
import { Avatar, BackBar, Badge, Button, Empty, Icon, SectionHead, SubscribeButton, ViewToggle, WorkGrid, WorkList, coverStyle } from '../ui.jsx';
import { fmtCount } from '../i18n.js';
import { fileToDataUrl } from '../util.js';

export function profileCover(creator) {
  return creator.cover ?? { kind: 'hue', hue: creator.hue };
}

export function CreatorPage({ id }) {
  const { works, creators, state, dispatch, lang } = useStore();
  const { push, openReport, requireLogin, toast } = useApp();
  const t = useT();
  const c = creators[id];
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState('grid');
  if (!c)
    return (
      <div className="screen">
        <BackBar title={t('창작자')} />
        <Empty title={t('창작자를 찾을 수 없어요')} />
      </div>
    );
  const me = id === 'me';
  const mine = works.filter((w) => w.creatorId === id).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const featured = mine.find((w) => w.id === c.featuredWorkId) ?? mine[0];
  const series = SERIES.filter((s) => s.creatorId === id);
  const blocked = state.blocked.includes(id);
  const less = state.lessFrom.includes(id);
  const anon = me && c.nameMode === 'anon';
  const List = view === 'grid' ? WorkGrid : WorkList;
  return (
    <div className="screen screen-profile">
      <BackBar
        title={anon ? t('익명') : `@${c.handle}`}
        right={
          !me && (
            <button type="button" className="icon-btn" aria-label={t('더 보기')} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              <Icon name="more" />
            </button>
          )
        }
      />
      {menu && !me && (
        <div className="card menu">
          <Button
            variant="ghost"
            icon="eye-off"
            onClick={() => {
              dispatch({ type: 'lessFrom', creatorId: id });
              setMenu(false);
              toast(less ? t('이 작가 추천을 다시 늘려요') : t('이 작가 추천을 줄일게요'));
            }}
          >
            {less ? t('이 작가 추천 다시 늘리기') : t('이 작가 추천 줄이기')}
          </Button>
          <Button
            variant="ghost"
            icon="flag"
            onClick={() => {
              setMenu(false);
              openReport('user', id);
            }}
          >
            {t('신고')}
          </Button>
          <Button
            variant="danger"
            icon="x"
            onClick={() =>
              requireLogin(() => {
                dispatch({ type: 'toggleBlock', creatorId: id });
                setMenu(false);
                toast(blocked ? t('차단을 해제했어요') : t('차단했어요. 이 창작자의 작품이 보이지 않아요'));
              })
            }
          >
            {blocked ? t('차단 해제') : t('사용자 차단')}
          </Button>
        </div>
      )}

      <div className="profile-banner" style={coverStyle(profileCover(c), c.hue)}>
        {me && (
          <button type="button" className="banner-edit" onClick={() => push({ kind: 'customize' })} aria-label={t('프로필 꾸미기')}>
            <Icon name="palette" size={16} /> {t('꾸미기')}
          </button>
        )}
      </div>
      <div className="profile-head profile-head-banner">
        <Avatar name={c.name} hue={c.hue} size={84} anon={anon} />
        <h1 className="detail-title">{displayName(c, t)}</h1>
        {me && c.nameMode === 'name' && <p className="muted small">@{c.handle}</p>}
        <p className="profile-intro">{c.intro || (me ? t('아직 소개가 없어요.') : '')}</p>
        {mine.length > 0 && (
          <div className="profile-cats" aria-label={t('주로 올리는 카테고리')}>
            {[...new Set(mine.map((w) => w.category))].slice(0, 3).map((k) => (
              <Badge key={k} tone="accent">
                {t(CAT[k].name)}
              </Badge>
            ))}
            {mine.some((w) => w.paid) && <Badge tone="warm">{t('유료 작품 있음')}</Badge>}
            {series.length > 0 && <Badge>{t('연재 {n}편', { n: series.length })}</Badge>}
          </div>
        )}
        <div className="profile-stats">
          <span>
            <strong>{fmtCount(subscriberCount(c, state), lang)}</strong> {t('구독자')}
            {!me && <span className="demo-mini">{t('데모')}</span>}
          </span>
          <span>
            <strong>{mine.length}</strong> {t('작품')}
          </span>
          {me && (
            <span>
              <strong>{state.subscriptions.length}</strong> {t('구독 중')}
            </span>
          )}
        </div>
        {me ? (
          <div className="btn-row">
            <Button variant="secondary" icon="palette" onClick={() => push({ kind: 'customize' })}>
              {t('내 피드 꾸미기')}
            </Button>
            <Button variant="ghost" onClick={() => push({ kind: 'settings' })}>
              {t('설정')}
            </Button>
          </div>
        ) : (
          <SubscribeButton creatorId={id} />
        )}
      </div>
      {featured && (
        <>
          <SectionHead title={t('대표 작품')} />
          <WorkList works={[featured]} showCreator={false} />
        </>
      )}
      {series.length > 0 && (
        <>
          <SectionHead title={t('연재')} />
          <div className="list">
            {series.map((s) => (
              <button key={s.id} type="button" className="row" onClick={() => push({ kind: 'series', id: s.id })}>
                <span className="row-text">
                  <span className="row-title">{s.title}</span>
                  <span className="row-sub">
                    {t('{n}화', { n: s.episodeIds.length })} · {s.desc}
                  </span>
                </span>
                <Icon name="chevron-right" />
              </button>
            ))}
          </div>
        </>
      )}
      <SectionHead title={t('게시 작품')} sub={t('최근 게시 순')} action={<ViewToggle view={view} onChange={setView} />} />
      <List works={mine} queue showCreator={false} emptyText={me ? t('아직 게시한 작품이 없어요. 만들기에서 첫 이야기를 올려 보세요.') : t('아직 게시한 작품이 없어요.')} />
    </div>
  );
}

export const HUES = [170, 28, 345, 205, 38, 150, 265, 300, 230, 120, 0, 90];

// 배경 고르기: 프리셋 / 사진 올리기 / 색
export function CoverPicker({ value, onChange, allowHue = true, allowDefault = true, defaultLabel }) {
  const t = useT();
  const { toast } = useApp();
  const fileRef = useRef(null);
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f, 900, 0.8);
      onChange({ kind: 'image', dataUrl });
    } catch {
      toast(t('사진을 읽지 못했어요. 다른 파일로 시도해 주세요.'));
    }
  };
  return (
    <div className="cover-picker">
      <div className="swatches">
        {allowDefault && (
          <button type="button" className={`swatch swatch-default ${!value ? 'swatch-on' : ''}`} onClick={() => onChange(undefined)} aria-label={defaultLabel ?? t('기본')}>
            <span>{defaultLabel ?? t('기본')}</span>
          </button>
        )}
        {COVER_PRESETS.map((p) => (
          <button key={p.id} type="button" className={`swatch ${value?.kind === 'preset' && value.id === p.id ? 'swatch-on' : ''}`} style={{ background: p.css }} onClick={() => onChange({ kind: 'preset', id: p.id })} aria-label={p.id} />
        ))}
        {allowHue &&
          HUES.map((h) => (
            <button key={h} type="button" className={`swatch ${value?.kind === 'hue' && value.hue === h ? 'swatch-on' : ''}`} style={{ background: `linear-gradient(145deg, oklch(0.9 0.07 ${h}), oklch(0.68 0.14 ${h}))` }} onClick={() => onChange({ kind: 'hue', hue: h })} aria-label={`hue ${h}`} />
          ))}
        <button type="button" className={`swatch swatch-upload ${value?.kind === 'image' ? 'swatch-on' : ''}`} onClick={() => fileRef.current?.click()} aria-label={t('사진 올리기')}>
          <Icon name="image" size={18} />
          <span>{t('사진')}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      {value?.kind === 'image' && <p className="muted small">{t('사진은 이 기기에만 저장돼요. 얼굴이나 개인정보가 드러나는 사진은 피해 주세요.')}</p>}
    </div>
  );
}

export function CustomizePage() {
  const { state, dispatch } = useStore();
  const { toast, back } = useApp();
  const t = useT();
  const me = state.me;
  const [name, setName] = useState(me.name);
  const [handle, setHandle] = useState(me.handle);
  const [intro, setIntro] = useState(me.intro);
  const [hue, setHue] = useState(me.hue);
  const [cover, setCover] = useState(me.cover);
  const [nameMode, setNameMode] = useState(me.nameMode ?? 'name');
  const preview = { ...me, name, handle, intro, hue, cover, nameMode, id: 'me' };
  const save = () => {
    dispatch({ type: 'updateProfile', me: { name: name.trim() || t('나'), handle: handle.trim().replace(/^@/, '') || 'me', intro: intro.trim(), hue, cover, nameMode } });
    toast(t('내 피드를 꾸몄어요'));
    back();
  };
  return (
    <div className="screen">
      <BackBar title={t('내 피드 꾸미기')} />
      <div className="profile-banner profile-banner-preview" style={coverStyle(profileCover(preview), hue)} />
      <div className="profile-head profile-head-banner">
        <Avatar name={name} hue={hue} size={72} anon={nameMode === 'anon'} />
        <h2 className="detail-title">{displayName(preview, t)}</h2>
        {nameMode === 'name' && <p className="muted small">@{handle || 'me'}</p>}
        <p className="profile-intro">{intro || t('아직 소개가 없어요.')}</p>
      </div>

      <SectionHead title={t('배경')} sub={t('프리셋을 고르거나 내 사진을 올려요')} />
      <CoverPicker value={cover} onChange={setCover} allowDefault={false} />

      <SectionHead title={t('프로필 색')} />
      <div className="swatches">
        {HUES.map((h) => (
          <button key={h} type="button" className={`swatch swatch-round ${hue === h ? 'swatch-on' : ''}`} style={{ background: `oklch(0.86 0.07 ${h})` }} onClick={() => setHue(h)} aria-label={`hue ${h}`} />
        ))}
      </div>

      <SectionHead title={t('이름 표시')} sub={t('이름을 드러내고 싶지 않으면 닉네임만 보이거나 익명으로 둘 수 있어요')} />
      <div className="radio-list">
        {[
          ['name', t('이름 보이기'), t('이름과 @닉네임이 함께 보여요')],
          ['handle', t('닉네임만'), t('이름은 숨기고 @닉네임만 보여요')],
          ['anon', t('익명'), t('이름·닉네임 모두 숨기고 “익명”으로 보여요')],
        ].map(([v, label, desc]) => (
          <label key={v} className={`radio ${nameMode === v ? 'radio-on' : ''}`}>
            <input type="radio" name="nameMode" checked={nameMode === v} onChange={() => setNameMode(v)} />
            <span>
              <strong>{label}</strong> <span className="small muted">— {desc}</span>
            </span>
          </label>
        ))}
      </div>

      <SectionHead title={t('프로필')} />
      <label className="field">
        <span>{t('이름')}</span>
        <input id="pf-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={12} />
      </label>
      <label className="field">
        <span>{t('닉네임')}</span>
        <input id="pf-handle" type="text" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={16} placeholder="night_walker" />
      </label>
      <label className="field">
        <span>{t('소개')}</span>
        <textarea id="pf-intro" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={120} />
      </label>
      <Button variant="primary" size="lg" block onClick={save}>
        {t('저장')}
      </Button>
    </div>
  );
}
