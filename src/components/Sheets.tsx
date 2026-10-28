import { useEffect, useRef, useState, type ReactNode } from 'react';
import { aiChat, FEATURES, type AiReply } from '../api';
import { COUNTRY_OPTIONS, DEMO_WEB, SUGGESTIONS, WHEEL } from '../demo';
import { useSpeech } from '../hooks/useSpeech';
import { useToast } from '../toast';
import type { Filters, Item } from '../types';
import { AdBanner, MiniCard, Thumb } from './Cards';
import { Icon } from './Icon';

export function Sheet({ children, onClose, ai }: { children: ReactNode; onClose: () => void; ai?: boolean }) {
  return (
    <div className={'sheet on' + (ai ? ' ai' : '')} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'sh' + (ai ? ' aisp' : '')} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

export function FilterSheet({ value, kind, onApply, onClose }: { value: Filters; kind: 'web' | 'ads'; onApply: (f: Filters) => void; onClose: () => void }) {
  const [f, setF] = useState(value);
  return (
    <Sheet onClose={onClose}>
      <h3>Фильтры</h3>
      <select className="inp" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
        {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c || 'Любая страна'}</option>)}
      </select>
      <input className="inp" placeholder="Город" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
      <div className="two">
        <input className="inp" placeholder="Цена от" inputMode="numeric" value={f.priceMin ?? ''} onChange={(e) => setF({ ...f, priceMin: e.target.value })} />
        <input className="inp" placeholder="Цена до" inputMode="numeric" value={f.priceMax ?? ''} onChange={(e) => setF({ ...f, priceMax: e.target.value })} />
      </div>
      {kind === 'ads' && (
        <>
          <div className="br" style={{ marginBottom: 12 }}>
            {['Аренда', 'Продажа', 'Посуточно'].map((c) => <button key={c} className="chip" aria-pressed={f.dealType === c} onClick={() => setF({ ...f, dealType: f.dealType === c ? '' : c })}>{c}</button>)}
          </div>
          <label className="row" style={{ border: 0, paddingTop: 0 }}>Только доступные
            <input className="tg" type="checkbox" checked={f.onlyAvailable} onChange={(e) => setF({ ...f, onlyAvailable: e.target.checked })} />
          </label>
        </>
      )}
      <div className="two">
        <button className="b" onClick={() => onApply({ country: '', city: '', onlyAvailable: false, priceMin: '', priceMax: '', dealType: '' })}>Сбросить</button>
        <button className="b p" onClick={() => onApply(f)}>Показать</button>
      </div>
    </Sheet>
  );
}

export function ConfirmSheet({ title, text, okLabel, onOk, onClose }: { title: string; text: string; okLabel: string; onOk: () => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h3>{title}</h3>
      <p style={{ color: 'var(--mut)', margin: '0 0 14px' }}>{text}</p>
      <div className="two">
        <button className="b" onClick={onClose}>Отмена</button>
        <button className="b" style={{ background: '#d92d4a', borderColor: '#d92d4a', color: '#fff' }} onClick={onOk}>{okLabel}</button>
      </div>
    </Sheet>
  );
}

export function NeedSheet({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h3>Нужен аккаунт</h3>
      <p style={{ color: 'var(--mut)', margin: '0 0 14px' }}>Это действие доступно после входа или регистрации.</p>
      <div className="two"><button className="b" onClick={onClose}>Позже</button><button className="b p" onClick={onLogin}>Войти</button></div>
    </Sheet>
  );
}

/* ---------- Колесо стран ---------- */
const pt = (a: number, r: number) => `${(r * Math.sin((a * Math.PI) / 180)).toFixed(1)} ${(-r * Math.cos((a * Math.PI) / 180)).toFixed(1)}`;

export function IdeasSheet({ popular, banners, onOpen, onClose }: { popular: Item[]; banners: Item[]; onOpen: (x: Item, ad?: boolean) => void; onClose: () => void }) {
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<[string, string] | null>(null);
  const timer = useRef<number>();
  const toast = useToast();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const next = rot + 1800 + Math.floor(Math.random() * 360);
    setRot(next);
    timer.current = window.setTimeout(() => {
      const n = ((next % 360) + 360) % 360;
      setResult(WHEEL[Math.round(((360 - n) % 360) / 45) % 8]);
      setSpinning(false);
    }, 4300);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="shh"><h3>Идеи для отдыха</h3><button className="ib" aria-label="Закрыть" onClick={onClose}>✕</button></div>
      <div className="mini">Крутите колесо: какая страна выпадет, туда и поедем</div>
      <div className="wheel">
        <span className="ptr" />
        <svg viewBox="-104 -104 208 208" width="230" height="230" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? 'transform 4.2s cubic-bezier(.12,.6,.1,1)' : 'none' }}>
          {WHEEL.map((c, i) => (
            <g key={c[0]}>
              <path d={`M0 0L${pt(i * 45 - 22.5, 100)}A100 100 0 0 1 ${pt(i * 45 + 22.5, 100)}Z`} fill={i % 2 ? '#3b82f6' : '#1e3a8a'} stroke="#fff" strokeWidth="2" />
              <text transform={`rotate(${i * 45 - 90})`} x="90" y="3.5" textAnchor="end" fontSize="9.5" fontWeight="700" fill="#fff">{c[0]}</text>
            </g>
          ))}
          <circle r="14" fill="#fff" />
        </svg>
      </div>
      <div className="res2">
        {spinning ? 'Крутится…' : result ? (<>Выпало: <b>{result[0]}</b><br />Куда поехать: {result[1]}<br /><button className="b p" style={{ marginTop: 8 }} onClick={() => toast(`Откройте AI-помощник и спросите про «${result[1]}»`)}>Найти варианты</button></>) : 'Нажмите «Крутить колесо»'}
      </div>
      <button className="b p" style={{ width: '100%' }} disabled={spinning} onClick={spin}>{result ? 'Крутить ещё' : 'Крутить колесо'}</button>
      {popular.length > 0 && <h4>Популярное: много лайков</h4>}
      {popular.map((x) => (
        <button key={x.id} className="mi" onClick={() => onOpen(x)}>
          <Thumb x={x} /><span><b>{x.title}</b><br /><span className="hl">♥ {(x.likes ?? 0).toLocaleString('ru-RU')}</span></span>
        </button>
      ))}
      {banners.length > 0 && <h4>Реклама отелей</h4>}
      {banners.map((x) => <div key={x.id} style={{ marginBottom: 10 }}><AdBanner x={x} onOpen={() => onOpen(x, true)} /></div>)}
    </Sheet>
  );
}

/* ---------- AI-помощник ---------- */
type Msg = { role: 'user'; text: string; image?: string } | { role: 'ai'; step: number; reply?: AiReply; error?: string };
const STEPS = ['Понимаю запрос', 'Ищу в интернете', 'Сверяю цены и источники'];
const FOLLOW_UPS = ['Только с завтраком', 'Дешевле', 'Показать на карте'];

export function AiSheet({ onOpen, onClose }: { onOpen: (x: Item) => void; onClose: () => void }) {
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const convo = useRef<string>();
  const gen = useRef(0); // номер чата: ответы от удалённого чата игнорируются
  const [ask, setAsk] = useState(false);
  const chat = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const voice = useSpeech(setText, toast);
  useEffect(() => { const c = chat.current; if (c) c.scrollTop = c.scrollHeight; }, [msgs, ask]);

  async function send(q = text) {
    q = q.trim();
    if ((!q && !photo) || busy) return;
    setBusy(true);
    setText('');
    const g = gen.current;
    const img = photo;
    const imgFile = photoFile;
    setPhoto(undefined);
    setPhotoFile(undefined);
    setMsgs((m) => [...m, { role: 'user', text: q, image: img }, { role: 'ai', step: 0 }]);
    const tick = window.setInterval(() => setMsgs((m) => m.map((x, i) => (i === m.length - 1 && x.role === 'ai' && x.step < 2 ? { ...x, step: x.step + 1 } : x))), 650);
    try {
      const reply = await aiChat(q, convo.current, imgFile);
      if (g !== gen.current) return;
      convo.current = (reply as { conversationId?: string }).conversationId ?? convo.current;
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { role: 'ai', step: 3, reply } : x)));
    } catch (e) {
      if (g !== gen.current) return;
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { role: 'ai', step: 3, error: (e as Error).message } : x)));
    } finally {
      window.clearInterval(tick);
      if (g === gen.current) setBusy(false);
    }
  }

  function clearChat() {
    gen.current += 1;
    setMsgs([]);
    setPhoto(undefined);
    setPhotoFile(undefined);
    setText('');
    setBusy(false);
    convo.current = undefined;
  }

  function pick(f?: File) {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return toast('Выберите JPEG, PNG или WebP');
    if (f.size > 8 * 1024 * 1024) return toast('Фото должно быть не больше 8 МБ');
    setPhoto(URL.createObjectURL(f));
    setPhotoFile(f);
  }

  return (
    <Sheet onClose={onClose} ai>
      <div className="aiv">
        <div className="aih">
          <button className="bk2" aria-label="Закрыть" style={{ fontSize: 18 }} onClick={onClose}>✕</button>
          <div className="aiti"><span className="aig"><Icon n="g" size={16} /></span>Kochmon AI<span className="aib2">AI</span></div>
          <button className="ib" aria-label="Новый поиск" style={{ fontSize: 20 }} onClick={() => { clearChat(); setAsk(false); }}>↺</button>
          <button className="ib" aria-label="Удалить чат" onClick={() => (msgs.length ? setAsk(true) : toast('Чат пуст'))}><Icon n="t" /></button>
        </div>
        <div className="chat" ref={chat}>
          {ask && (
            <div className="delbar">
              <span>Удалить весь чат?</span>
              <button className="b" onClick={() => setAsk(false)}>Отмена</button>
              <button className="b" style={{ background: '#d92d4a', borderColor: '#d92d4a', color: '#fff' }} onClick={() => { clearChat(); setAsk(false); toast('Чат удалён'); }}>Удалить</button>
            </div>
          )}
          {msgs.length === 0 && (
            <div className="wl">
              <span className="wlg"><Icon n="g" size={30} /></span>
              <h2>Что ищете?</h2>
              <p>Спросите про отели, квартиры и места отдыха. {FEATURES.aiImages ? 'Можно текстом, голосом или фото.' : 'Можно текстом или голосом.'}</p>
              <div className="sg">{SUGGESTIONS.map((s) => <button key={s} onClick={() => void send(s)}>{s}</button>)}</div>
            </div>
          )}
          {msgs.map((m, i) => m.role === 'user' ? (
            <div key={i} className="ub">{m.image && <img src={m.image} alt="" />}{m.text && <span>{m.text}</span>}</div>
          ) : (
            <div key={i} className="ab">
              <div className="aih2"><span className="aig"><Icon n="g" size={14} /></span><b>Kochmon AI</b>{m.reply?.demo && <span className="dm">Демо-ответ</span>}</div>
              {!m.error && <div className="stp">{STEPS.map((s, k) => <div key={s} className={'st ' + (m.step > k ? 'ok' : m.step === k ? 'run' : '')}>{m.step > k ? '✓' : <i />}{s}</div>)}</div>}
              {m.error && <p className="at" role="alert">{m.error}</p>}
              {m.reply && <p className="at">{m.reply.text}</p>}
              {m.reply && m.reply.items.length > 0 && <div className="mcs">{m.reply.items.map((x) => <MiniCard key={x.id} x={x} onOpen={() => onOpen(x)} />)}</div>}
              {m.reply && m.reply.sources.length > 0 && <div className="srcs">{m.reply.sources.map((s) => <span key={s}><Icon n="l" size={12} />{s}</span>)}</div>}
              {m.reply && i === msgs.length - 1 && <div className="fu">{FOLLOW_UPS.map((f) => <button key={f} className="chip" disabled={busy} onClick={() => void send(f)}>{f}</button>)}</div>}
            </div>
          ))}
        </div>
        <div className="comp">
          {photo && <div className="pchip"><img src={photo} alt="" /><span>Фото для поиска</span><button className="ib" aria-label="Убрать фото" style={{ width: 26, height: 26 }} onClick={() => { setPhoto(undefined); setPhotoFile(undefined); }}>✕</button></div>}
          <div className="cbx">
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <button className="ib" aria-label="Фото" disabled={!FEATURES.aiImages} title={FEATURES.aiImages ? 'Фото' : 'Анализ фото скоро появится'} onClick={() => file.current?.click()}><Icon n="c" /></button>
            <textarea rows={1} placeholder="Спросите AI о местах" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} />
            <button className={'ib' + (voice.on ? ' rec' : '')} aria-label="Голос" onClick={voice.toggle}><Icon n="m" /></button>
            <button className="snd" aria-label="Отправить" disabled={busy} onClick={() => void send()}><Icon n="a" /></button>
          </div>
          <div className="note2">AI может ошибаться. Цены и наличие проверяйте на сайте источника.</div>
        </div>
      </div>
    </Sheet>
  );
}

export const demoPopular = [...DEMO_WEB].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);
