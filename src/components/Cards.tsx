import type { CSSProperties } from 'react';
import type { Item } from '../types';
import { Icon } from './Icon';

const cv = (p: string) => ({ '--p': p }) as CSSProperties;
const bg = (x: Item): CSSProperties =>
  x.photo ? { backgroundImage: `url(${x.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : x.pos ? { backgroundPosition: x.pos } : {};

export function ListingCard({ x, saved, onOpen, onSave }: { x: Item; saved: boolean; onOpen: () => void; onSave: () => void }) {
  return (
    <article className="card" onClick={onOpen}>
      <div className={'ph' + (x.pos || x.photo ? '' : ' np')} style={bg(x)}>
        <button className={'hb' + (saved ? ' on' : '')} aria-label="В сохранённое" onClick={(e) => { e.stopPropagation(); onSave(); }}>
          <Icon n="h" size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {x.kind === 'ads' && x.status && <span className={'bd ' + (x.status === 'Доступно' ? 'ok' : 'no')}>{x.status}</span>}
      </div>
      <div className="cb">
        <h3>{x.title}</h3>
        <div className="pl"><Icon n="p" size={14} />{x.place}</div>
        <p>{x.description}</p>
        <div className="pr">{x.price}</div>
        {x.kind === 'web' ? (
          <a className="src" onClick={(e) => e.stopPropagation()}><Icon n="l" size={14} />{x.source}</a>
        ) : (
          <div className="meta">{[x.date, x.phone].filter(Boolean).join(' · ')}</div>
        )}
      </div>
    </article>
  );
}

export function AdBanner({ x, onOpen }: { x: Item; onOpen: () => void }) {
  return (
    <button className="adbn" style={cv(x.pos || '22% 78%')} onClick={onOpen}>
      <span className="rb2">Реклама</span>
      <b>{x.title}</b>
      <small>{x.description}</small>
    </button>
  );
}

export function MiniCard({ x, onOpen }: { x: Item; onOpen: () => void }) {
  return (
    <button className="mc" onClick={onOpen}>
      <span className="mci" style={bg(x)} />
      <b>{x.title}</b><small>{x.place}</small><em>{x.price}</em>
    </button>
  );
}

export function Thumb({ x }: { x: Item }) {
  return <span className="thm" style={bg(x)} />;
}

const PP = ['30% 82%', '92% 58%', '50% 28%', '70% 100%'];

export function ItemDetail({ x, ad, saved, canEdit, onBack, onSave, onToast }: { x: Item; ad?: boolean; saved: boolean; canEdit: boolean; onBack: () => void; onSave: () => void; onToast: (t: string) => void }) {
  void canEdit;
  const gallery = !x.photo && x.pos;
  return (
    <div className="dt">
      <div className="dl">
        <div className="dph" style={bg(x)}>
          <button className="bk" aria-label="Назад" onClick={onBack}>‹</button>
          <button className={'hb' + (saved ? ' on' : '')} aria-label="В сохранённое" onClick={onSave}><Icon n="h" size={18} fill={saved ? 'currentColor' : 'none'} /></button>
        </div>
        {gallery && <div className="dg">{PP.map((p) => <button key={p} style={cv(p)} className={p === x.pos ? 'on' : ''} aria-label="Фото" onClick={(e) => { const ph = (e.currentTarget.closest('.dl') as HTMLElement).querySelector('.dph') as HTMLElement; ph.style.backgroundPosition = p; }} />)}</div>}
      </div>
      <div className="dc">
        {ad && <span className="bd inline adb">Реклама</span>}
        {x.kind === 'ads' && x.status && <span className={'bd inline ' + (x.status === 'Доступно' ? 'ok' : 'no')}>{x.status}</span>}
        <h1>{x.title}</h1>
        <div className="pl"><Icon n="p" size={14} />{x.place}</div>
        <div className="pr big">{x.price}</div>
        <p>{x.description}</p>
        <div className="sec" style={{ margin: '8px 0' }}>
          {x.kind === 'web' ? (
            <>
              <div className="row"><span>Источник</span><b>{x.source}</b></div>
              <div className="row"><span>Тип</span><b>{x.tag}</b></div>
              <div className="row"><small>Данные получены из интернета. Проверьте цену и наличие на сайте источника.</small></div>
            </>
          ) : (
            <>
              <div className="row"><span>Категория</span><b>{x.tag}</b></div>
              {x.date && <div className="row"><span>Опубликовано</span><b>{x.date}</b></div>}
              {x.phone && <div className="row"><span>Контакт</span><b>{x.phone}</b></div>}
            </>
          )}
        </div>
        <div className="br">
          {x.kind === 'web' ? (
            <button className="b p" style={{ flex: 1 }} onClick={() => onToast('Ссылка на источник появится, когда backend начнёт отдавать URL')}>Открыть источник</button>
          ) : (
            <>
              <a className="b p" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} href={x.phone ? `tel:${x.phone.replace(/\s/g, '')}` : undefined}>Позвонить</a>
              <button className="b" style={{ flex: 1 }} onClick={() => onToast('Чат с автором пока не поддерживается backend')}>Написать</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
