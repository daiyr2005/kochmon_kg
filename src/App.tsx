import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO, addFavorite, deactivateListing, deleteListing, fetchMe, getBanner, getFavorites, logout, publishListing, removeFavorite, setToken } from './api';
import AuthScreen from './components/AuthScreen';
import { ItemDetail } from './components/Cards';
import { AdForm, AddListing, GuestProfile, MyListings, Profile, Saved } from './components/Account';
import Find from './components/Find';
import { Icon, Logo } from './components/Icon';
import { AiSheet, ConfirmSheet, FilterSheet, IdeasSheet, NeedSheet } from './components/Sheets';
import { DEMO_ADS, DEMO_BANNERS, DEMO_SAVED, DEMO_WEB } from './demo';
import { useToast } from './toast';
import type { Filters, Item, Kind, SheetName, Session, Tab, View } from './types';

const DEMO_CACHE: Record<string, Item> = Object.fromEntries([...DEMO_WEB, ...DEMO_ADS].map((x) => [x.id, x]));
const NO_FILTERS: Filters = { country: '', city: '', onlyAvailable: false, priceMin: '', priceMax: '' };

export default function App() {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>('find');
  const [view, setView] = useState<View | null>(null);
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [cat, setCat] = useState<Kind>('web');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [saved, setSaved] = useState<Set<string>>(DEMO ? new Set(DEMO_SAVED) : new Set());
  const [cache, setCache] = useState<Record<string, Item>>(DEMO ? DEMO_CACHE : {});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<Item | null>(null);
  const scr = useRef<HTMLDivElement>(null);
  const isUser = session?.kind === 'user';

  const remember = useCallback((items: Item[]) => setCache((c) => ({ ...c, ...Object.fromEntries(items.map((x) => [x.id, x])) })), []);

  useEffect(() => { void getBanner().then(setBanner).catch((e: Error) => toast(e.message)); }, [toast]);
  useEffect(() => { scr.current?.scrollTo(0, 0); }, [tab, view]);

  // Возврат из Google OAuth: backend должен передать токен во фрагменте URL (#access_token=...), он не попадает в логи сервера.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const t = hash.get('access_token') ?? query.get('access_token');
    const r = hash.get('refresh_token') ?? query.get('refresh_token');
    const err = query.get('error') ?? hash.get('error');
    if (err) {
      window.history.replaceState(null, '', window.location.pathname);
      toast(err === 'account_disabled' ? 'Аккаунт отключён' : 'Не удалось войти через Google');
      return;
    }
    if (!t) return;
    window.history.replaceState(null, '', window.location.pathname);
    setToken(t, r);
    fetchMe().then(enter).catch((e: Error) => toast(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enter(s: Session) {
    setSession(s);
    setTab('find');
    setView(null);
    toast(s.kind === 'guest' ? 'Вы вошли как гость' : `Добро пожаловать, ${s.name}`);
    if (s.kind === 'user') {
      getFavorites().then((items) => { remember(items); setSaved(new Set(items.map((x) => x.id))); }).catch((e: Error) => toast(e.message));
    }
  }

  function toggleSave(x: Item) {
    const on = !saved.has(x.id);
    remember([x]);
    setSaved((s) => { const n = new Set(s); if (on) n.add(x.id); else n.delete(x.id); return n; });
    // Избранное на backend привязано к объявлениям; результаты из интернета сохраняются только в этой сессии.
    if (isUser && x.kind === 'ads') (on ? addFavorite(x.id) : removeFavorite(x.id)).catch((e: Error) => toast(e.message));
  }

  function open(x: Item, ad?: boolean) { remember([x]); setSheet(null); setView({ k: 'item', id: x.id, ad }); }
  function needUser(fn: () => void) { if (isUser) fn(); else setSheet('need'); }
  function goTab(t: Tab) { setTab(t); setView(null); }
  function leave() { logout(); setSession(null); setSaved(DEMO ? new Set(DEMO_SAVED) : new Set()); }

  async function confirmDelete(id: string) {
    setSheet(null);
    try {
      await deleteListing(id);
      setRemoved((r) => new Set(r).add(id));
      setSaved((s) => { const n = new Set(s); n.delete(id); return n; });
      toast('Объявление удалено');
    } catch (e) { toast((e as Error).message); }
  }
  async function archive(x: Item) {
    try { await deactivateListing(x.id); toast('Объявление отправлено в архив'); } catch (e) { toast((e as Error).message); }
  }
  async function toggleAvailability(x: Item) {
    try {
      if (x.status === 'Доступно') await deactivateListing(x.id);
      else await publishListing(x.id);
      toast(x.status === 'Доступно' ? 'Объявление стало недоступным' : 'Объявление снова доступно');
    } catch (e) { toast((e as Error).message); }
  }

  const savedItems = [...saved].map((id) => cache[id]).filter(Boolean);
  const popular = Object.values(cache).filter((x) => (x.likes ?? 0) > 0).sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0)).slice(0, 3);
  const item = view?.k === 'item' ? cache[view.id] : undefined;
  const back = () => setView(null);

  let body;
  if (view?.k === 'item') {
    body = item ? <ItemDetail x={item} ad={view.ad} saved={saved.has(item.id)} canEdit={false} onBack={back} onSave={() => toggleSave(item)} onToast={toast} /> : <div className="state">Объект не найден<br /><button className="b p" onClick={back}>Назад</button></div>;
  }   else if (view?.k === 'mine') body = <MyListings onBack={back} onOpen={(x) => open(x)} onAdd={() => setView({ k: 'add' })} onEdit={(item) => setView({ k: 'edit', item })} onDelete={(x) => setSheet({ k: 'confirm', id: x.id })} onArchive={archive} onToggleAvailability={toggleAvailability} removed={removed} />;
  else if (view?.k === 'add') body = <AddListing onBack={back} onDone={() => setView({ k: 'mine' })} />;
  else if (view?.k === 'edit') body = <AddListing item={view.item} onBack={back} onDone={() => setView({ k: 'mine' })} />;
  else if (view?.k === 'adv') body = <AdForm onBack={back} onDone={back} />;
  else if (tab === 'saved') body = <Saved items={savedItems} saved={saved} onOpen={(x) => open(x)} onSave={toggleSave} />;
  else if (tab === 'prof') {
    body = session?.kind === 'user'
      ? <Profile session={session} savedCount={saved.size} onLogout={leave} go={(k) => (k === 'saved' ? goTab('saved') : needUser(() => setView({ k })))} />
      : <GuestProfile onLogin={leave} />;
  }

  const pending = sheet && typeof sheet === 'object' ? sheet.id : '';
  return (
    <>
      <div className="stage"><div className="phone v2">
        <div className="scr" ref={scr}>
          {session && (
            <div style={{ display: tab === 'find' && !view ? 'block' : 'none' }}>
              <Find cat={cat} setCat={setCat} filters={filters} saved={saved} onSave={toggleSave} onOpen={open} onLoaded={remember} openSheet={(s) => setSheet(s)} />
            </div>
          )}
          {body}
        </div>
        <nav className="nav">
          <div className="nbrand"><Logo id="lgn" />Kochmon AI</div>
          {([['find', 'Найти', 's'], ['saved', 'Сохранённое', 'h'], ['prof', isUser ? 'Профиль' : 'Войти', 'u']] as const).map(([k, label, ic]) => (
            <button key={k} className={'nb' + (tab === k ? ' on' : '')} onClick={() => goTab(k)}><Icon n={ic} size={24} />{label}</button>
          ))}
        </nav>
        {sheet === 'filters' && <FilterSheet value={filters} kind={cat} onApply={(f) => { setFilters(f); setSheet(null); }} onClose={() => setSheet(null)} />}
        {sheet === 'ideas' && <IdeasSheet popular={popular} banners={DEMO ? DEMO_BANNERS : banner ? [banner] : []} onOpen={open} onClose={() => setSheet(null)} />}
        {sheet === 'ai' && <AiSheet onOpen={open} onClose={() => setSheet(null)} />}
        {sheet === 'need' && <NeedSheet onLogin={() => { setSheet(null); leave(); }} onClose={() => setSheet(null)} />}
        {pending && <ConfirmSheet title="Удалить объявление?" text={`«${cache[pending]?.title ?? 'Объявление'}» будет удалено без возможности восстановления. Если оно просто неактуально, лучше отправьте его в архив.`} okLabel="Удалить" onOk={() => void confirmDelete(pending)} onClose={() => setSheet(null)} />}
      </div></div>
      {!session && <AuthScreen onEnter={enter} />}
    </>
  );
}
