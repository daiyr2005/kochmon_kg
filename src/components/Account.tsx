import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, DEMO, changePassword, fetchProfile, getChannels, getListings, getNotificationPreferences, linkTelegram, linkWhatsapp, submitCampaign, createListing, updateListing, unlinkChannel, updateMe, updateNotificationPreferences, verifyWhatsapp, type Channel, type NotificationPreferences } from '../api';
import { useToast } from '../toast';
import type { Item, Session } from '../types';
import { ListingCard } from './Cards';
import { Icon } from './Icon';

const NOTIFY: [keyof NotificationPreferences, string][] = [
  ['new_listings_by_category', 'Новые объявления по категориям'],
  ['new_objects_in_city', 'Новые объекты в выбранном городе'],
  ['saved_price_change', 'Изменение цены сохранённого'],
  ['inquiry_replies', 'Ответы на обращения'],
  ['booking_updates', 'Подтверждение и изменение брони'],
  ['booking_reminders', 'Напоминания о бронировании'],
];

export function Saved({ items, saved, onOpen, onSave }: { items: Item[]; saved: Set<string>; onOpen: (x: Item) => void; onSave: (x: Item) => void }) {
  return (
    <div className="cw wide">
      <div className="pg"><h1>Сохранённое</h1><p>Из интернета и объявлений Kochmon</p></div>
      <div className="list">
        {items.map((x) => <ListingCard key={x.id} x={x} saved={saved.has(x.id)} onOpen={() => onOpen(x)} onSave={() => onSave(x)} />)}
        {items.length === 0 && <div className="note state saved-empty" style={{ padding: '40px 0' }}>Пока пусто. Нажмите ♥ на карточке.</div>}
      </div>
    </div>
  );
}

export function GuestProfile({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="cw">
      <div className="pg"><h1>Профиль</h1><p>Вы вошли как гость</p></div>
      <div className="sec" style={{ textAlign: 'center', padding: '22px 16px' }}>
        <div className="av" style={{ margin: '0 auto 12px', background: '#cdd7ea' }}><Icon n="u" size={26} /></div>
        <b>Гостевой режим</b>
        <p style={{ color: 'var(--mut)', margin: '6px 0 14px', fontSize: 14 }}>Войдите, чтобы добавлять объявления, сохранять бронирования и управлять профилем.</p>
        <button className="b p" style={{ width: '100%', marginBottom: 8 }} onClick={onLogin}>Войти</button>
        <button className="b" style={{ width: '100%' }} onClick={onLogin}>Зарегистрироваться</button>
      </div>
      <div className="sl">Доступно гостям</div>
      <div className="sec">
        <div className="row">Поиск и фильтры<small>✓</small></div>
        <div className="row">Просмотр фото и описаний<small>✓</small></div>
        <div className="row">Публичный AI-поиск<small>✓</small></div>
      </div>
    </div>
  );
}

export function Profile({ session, savedCount, go, onLogout }: { session: Session; savedCount: number; go: (k: 'mine' | 'add' | 'adv' | 'saved') => void; onLogout: () => void }) {
  const toast = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [phone, setPhone] = useState('');
  const [whatsappChallenge, setWhatsappChallenge] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [profileName, setProfileName] = useState(session.name);
  const [profilePhone, setProfilePhone] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    new_listings_by_category: true,
    new_objects_in_city: true,
    saved_price_change: true,
    inquiry_replies: false,
    booking_updates: false,
    booking_reminders: false,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const refresh = () => getChannels().then(setChannels).catch((e: Error) => toast(e.message));
  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    let active = true;
    getNotificationPreferences().then((value) => { if (active) setNotifications(value); })
      .catch((e: Error) => { if (active) toast(e.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (DEMO) return;
    let active = true;
    fetchProfile().then((profile) => {
      if (active) {
        setProfileName(profile.full_name ?? session.name);
        setProfilePhone(profile.phone ?? '');
      }
    }).catch((e: Error) => { if (active) toast(e.message); });
    return () => { active = false; };
  }, [session.name]);
  const tg = channels.find((c) => c.type === 'telegram');
  const wa = channels.find((c) => c.type === 'whatsapp');

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    try { await fn(); if (ok) toast(ok); await refresh(); } catch (e) { toast((e as ApiError).message); } finally { setBusy(false); }
  }

  async function saveProfile() {
    if (profileName.trim().length < 2) return toast('Имя должно содержать минимум 2 символа');
    await run(async () => {
      const updated = await updateMe({ full_name: profileName.trim(), phone: profilePhone.trim() });
      setProfileName(updated.full_name ?? session.name);
      setProfilePhone(updated.phone ?? '');
      setEditingProfile(false);
    }, 'Профиль обновлён');
  }

  async function savePassword() {
    if (newPassword.length < 8 || !/[A-Za-zА-Яа-я]/.test(newPassword) || !/\d/.test(newPassword)) {
      return toast('Новый пароль: минимум 8 символов, хотя бы одна буква и одна цифра');
    }
    if (newPassword !== confirmPassword) return toast('Пароли не совпадают');
    await run(async () => {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
    }, 'Пароль изменён');
  }

  async function saveNotification(key: keyof NotificationPreferences, checked: boolean) {
    const previous = notifications;
    const next = { ...notifications, [key]: checked };
    setNotifications(next);
    setSavingNotifications(true);
    try { setNotifications(await updateNotificationPreferences(next)); }
    catch (e) { setNotifications(previous); toast((e as Error).message); }
    finally { setSavingNotifications(false); }
  }

  return (
    <div className="cw">
      <div className="pg"><h1>Профиль</h1><p>Настройки аккаунта</p></div>
      <div className="me"><div className="av">{profileName[0]?.toUpperCase()}</div><div><b>{profileName}</b>{DEMO && <><br /><small style={{ color: 'var(--mut)' }}>Демо-аккаунт</small></>}</div></div>
      <div className="acts" style={{ paddingTop: 10 }}><button onClick={() => go('mine')}>Мои объявления</button><button className="p" onClick={() => go('add')}>+ Объявление</button></div>
      <div className="sl">Аккаунт</div>
      <div className="sec">
        <button className="row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => setEditingProfile(!editingProfile)}>Личные данные<small>{editingProfile ? 'Скрыть' : 'Изменить ›'}</small></button>
        {editingProfile && <div className="ch">
          <label>Имя</label><input className="inp" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          <label>Телефон</label><input className="inp" inputMode="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
          <button className="b p" disabled={busy} onClick={() => void saveProfile()}>Сохранить данные</button>
        </div>}
        <button className="row" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => setPasswordOpen(!passwordOpen)}>Безопасность и пароль<small>{passwordOpen ? 'Скрыть' : 'Изменить ›'}</small></button>
        {passwordOpen && <div className="ch">
          <label>Текущий пароль</label><input className="inp" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <label>Новый пароль</label><input className="inp" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <label>Повторите пароль</label><input className="inp" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <button className="b p" disabled={busy} onClick={() => void savePassword()}>Изменить пароль</button>
        </div>}
        <div className="row">Язык интерфейса<select className="b" style={{ height: 36 }} defaultValue="ru"><option value="ru">Русский</option><option value="ky">Кыргызча</option><option value="en">English</option></select></div>
        <div className="row" style={{ cursor: 'pointer' }} onClick={() => go('saved')}>Управление избранным<small>{savedCount} ›</small></div>
      </div>
      <div className="sl">Реклама</div>
      <div className="sec"><div className="row"><span>Покажите отель или объект в блоке «Реклама» и в результатах поиска</span></div><div className="ch" style={{ paddingTop: 0 }}><button className="b p" style={{ width: '100%' }} onClick={() => go('adv')}>Разместить рекламу</button><div className="note" style={{ padding: '8px 0 0' }}>Заявок пока нет</div></div></div>
      <div className="sl">Уведомления</div>
      <div className="sec">{NOTIFY.map(([key, label]) => <label key={key} className="row">{label}<input className="tg" type="checkbox" checked={notifications[key]} disabled={savingNotifications} onChange={(e) => void saveNotification(key, e.target.checked)} /></label>)}</div>
      <div className="sl">Каналы</div>
      <div className="sec">
        <div className="ch">
          <div className="chh">Telegram<span className="pill">{tg ? 'Подключено' : 'Не подключено'}</span></div>
          <div className="br">
            {!tg && <button className="b p" disabled={busy} onClick={() => void run(async () => { const url = await linkTelegram(); if (url) window.open(url, '_blank', 'noopener'); })}>Подключить Telegram</button>}
            <button className="b" disabled={busy} onClick={() => void run(async () => undefined, 'Статус обновлён')}>Проверить</button>
            <button className="b" disabled={busy || !tg} onClick={() => tg && void run(() => unlinkChannel(tg.id), 'Telegram отключён')}>Отключить</button>
          </div>
        </div>
        <div className="ch" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="chh">WhatsApp<span className="pill">{wa ? 'Подключено' : 'Не подключено'}</span></div>
          {!wa && !whatsappChallenge && <input className="inp" placeholder="+996 700 000 000" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          {!wa && whatsappChallenge && <input className="inp" placeholder="Код из WhatsApp" inputMode="numeric" value={whatsappCode} onChange={(e) => setWhatsappCode(e.target.value)} />}
          <div className="br">
            {!wa && !whatsappChallenge && <button className="b p" disabled={busy} onClick={() => (phone.replace(/\D/g, '').length < 10 ? toast('Введите номер WhatsApp полностью, например +996 700 000 000') : void run(async () => { const result = await linkWhatsapp(phone); setWhatsappChallenge(result.challengeId); }, 'Код подтверждения отправлен'))}>Подключить WhatsApp</button>}
            {!wa && whatsappChallenge && <button className="b p" disabled={busy || whatsappCode.length !== 6} onClick={() => void run(async () => { await verifyWhatsapp(whatsappChallenge, whatsappCode); setWhatsappChallenge(''); setWhatsappCode(''); }, 'WhatsApp подключён')}>Подтвердить код</button>}
            <button className="b" disabled={busy || !wa} onClick={() => wa && void run(() => unlinkChannel(wa.id), 'WhatsApp отключён')}>Отключить</button>
          </div>
        </div>
      </div>
      <button className="out" onClick={onLogout}>Выйти из аккаунта</button>
    </div>
  );
}

export function MyListings({ onBack, onOpen, onAdd, onEdit, onDelete, onArchive, onToggleAvailability, removed }: { onBack: () => void; onOpen: (x: Item) => void; onAdd: () => void; onEdit: (x: Item) => void; onDelete: (x: Item) => void; onArchive: (x: Item) => Promise<void>; onToggleAvailability: (x: Item) => Promise<void>; removed: Set<string> }) {
  const [state, setState] = useState<{ loading: boolean; error: string; items: Item[] }>({ loading: true, error: '', items: [] });
  const [n, setN] = useState(0);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    getListings({ q: '', filters: { country: '', city: '', onlyAvailable: false }, mine: true })
      .then((items) => setState({ loading: false, error: '', items }))
      .catch((e: Error) => setState({ loading: false, error: e.message, items: [] }));
  }, [n, removed]);
  const items = state.items.filter((x) => !removed.has(x.id));
  return (
    <div className="cw">
      <div className="pg"><button className="b" style={{ height: 36 }} onClick={onBack}>‹ Назад</button><h1 style={{ marginTop: 12 }}>Мои объявления</h1><p>Управлять ими можете только вы</p></div>
      <div className="list">
        {state.loading && <div className="state">Загрузка…</div>}
        {state.error && <div className="state" role="alert">{state.error}<br /><button className="b p" onClick={() => setN(n + 1)}>Повторить</button></div>}
        {items.map((x) => (
          <article key={x.id} className="card" style={{ padding: 14, display: 'block' }} onClick={() => onOpen(x)}>
            <b>{x.title}</b>
            <div className="pl"><Icon n="p" size={14} />{x.place} · {x.price}</div>
            <div style={{ margin: '8px 0' }}><span className={'bd inline ' + (x.status === 'Доступно' ? 'ok' : 'no')}>{x.status}</span></div>
            <div className="br" onClick={(e) => e.stopPropagation()}>
              <button className="b" onClick={() => onEdit(x)}>Редактировать</button>
              <button className="b" disabled={x.status !== 'Доступно'} onClick={() => void onArchive(x).then(() => setN(n + 1))}>В архив</button>
              <button className="b" onClick={() => void onToggleAvailability(x).then(() => setN(n + 1))}>{x.status === 'Доступно' ? 'Сделать недоступным' : 'Сделать доступным'}</button>
              <button className="b" style={{ color: '#d92d4a', borderColor: '#f3c7cf' }} onClick={() => onDelete(x)}>Удалить</button>
            </div>
          </article>
        ))}
        {!state.loading && !state.error && items.length === 0 && <div className="note state" style={{ padding: '30px 0' }}>У вас пока нет объявлений</div>}
      </div>
      <div className="acts" style={{ paddingTop: 12 }}><button className="p" onClick={onAdd}>+ Добавить объявление</button></div>
    </div>
  );
}

function useForm(initial: Record<string, string>) {
  const [v, setV] = useState(initial);
  return { v, on: (k: string) => ({ value: v[k], onChange: (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value })) }) };
}

export function AddListing({ item, onBack, onDone }: { item?: Item; onBack: () => void; onDone: () => void }) {
  const toast = useToast();
  const { v, on } = useForm(item
    ? { title: item.title, city: item.place.split(',')[0].trim(), price: item.price.replace(/[^\d,.-]/g, '').replace(/\s/g, ''), category: item.tag, kind: item.dealType ?? 'Аренда', description: item.description, phone: item.phone ?? '' }
    : { title: '', city: '', price: '', category: 'Квартира', kind: 'Аренда', description: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.title.trim()) return toast('Введите название объявления');
    if (!v.city.trim()) return toast('Укажите город');
    if (!v.price.trim()) return toast('Укажите цену');
    setBusy(true);
    try {
      if (item) await updateListing(item.id, v, photo ?? undefined, removePhoto);
      else await createListing(v, photo ?? undefined);
      toast(item ? 'Объявление обновлено' : 'Объявление опубликовано');
      onDone();
    } catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="cw">
      <div className="pg"><button className="b" style={{ height: 36 }} onClick={onBack}>‹ Назад</button><h1 style={{ marginTop: 12 }}>{item ? 'Редактировать объявление' : 'Новое объявление'}</h1></div>
      <form className="fm" style={{ padding: '0 18px' }} onSubmit={(e) => void submit(e)}>
        <label>Название</label><input className="inp" placeholder="Например: 2-комн. квартира" {...on('title')} />
        <div className="two"><div><label>Город</label><input className="inp" placeholder="Бишкек" {...on('city')} /></div><div><label>Цена, сом</label><input className="inp" inputMode="numeric" placeholder="55000" {...on('price')} /></div></div>
        <div className="two">
          <div><label>Категория</label><select className="inp" {...on('category')}>{['Квартира', 'Дом', 'Участок', 'Отель', 'Гостевой дом'].map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>Тип</label><select className="inp" {...on('kind')}>{['Аренда', 'Продажа', 'Посуточно'].map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <label>Описание</label><textarea className="inp" placeholder="Коротко об объекте" {...on('description')} />
        <label>Контакты</label><input className="inp" inputMode="tel" placeholder="+996 ..." {...on('phone')} />
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > 8 * 1024 * 1024) toast('Фото должно быть не больше 8 МБ');
          else if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) toast('Выберите JPEG, PNG или WebP');
          else if (file) setPhoto(file);
          e.target.value = '';
        }} />
        <button type="button" className="b" style={{ width: '100%', marginBottom: 10 }} onClick={() => photoInput.current?.click()}>{photo ? photo.name : '+ Добавить фото'}</button>
        {photo && <button type="button" className="b" style={{ width: '100%', marginBottom: 10 }} onClick={() => setPhoto(null)}>Убрать выбранное фото</button>}
        {item?.photo && !removePhoto && <button type="button" className="b" style={{ width: '100%', marginBottom: 10 }} onClick={() => setRemovePhoto(true)}>Убрать текущее фото</button>}
        <button className="b p" style={{ width: '100%' }} disabled={busy}>{busy ? 'Отправка…' : item ? 'Сохранить изменения' : 'Опубликовать'}</button>
      </form>
    </div>
  );
}

export function AdForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const toast = useToast();
  const { v, on } = useForm({ title: '', city: '', type: 'Отель', placement: 'Блок «Реклама отелей»', days: '7 дней', description: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!v.title.trim()) return toast('Введите название объекта');
    if (!v.city.trim()) return toast('Укажите город');
    if (v.phone.replace(/\D/g, '').length < 10) return toast('Укажите контактный телефон');
    setBusy(true);
    try { await submitCampaign(v, photo ?? undefined); toast('Заявка отправлена на модерацию'); onDone(); } catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="cw">
      <div className="pg"><button className="b" style={{ height: 36 }} onClick={onBack}>‹ Назад</button><h1 style={{ marginTop: 12 }}>Размещение рекламы</h1><p>Покажите свой отель или объект путешественникам</p></div>
      <form className="fm" style={{ padding: '0 18px' }} onSubmit={(e) => void submit(e)}>
        <label>Название объекта</label><input className="inp" placeholder="Например: Отель «Ала-Тоо»" {...on('title')} />
        <div className="two"><div><label>Город</label><input className="inp" placeholder="Чолпон-Ата" {...on('city')} /></div><div><label>Тип</label><select className="inp" {...on('type')}>{['Отель', 'Гостевой дом', 'Квартира', 'Другое'].map((c) => <option key={c}>{c}</option>)}</select></div></div>
        <label>Где показывать</label><select className="inp" {...on('placement')}>{['Блок «Реклама отелей»', 'В результатах поиска', 'В колесе идей'].map((c) => <option key={c}>{c}</option>)}</select>
        <label>Срок</label><select className="inp" {...on('days')}>{['7 дней', '14 дней', '30 дней'].map((c) => <option key={c}>{c}</option>)}</select>
        <label>Описание</label><textarea className="inp" placeholder="Что предлагаете гостям" {...on('description')} />
        <label>Контакты</label><input className="inp" inputMode="tel" placeholder="+996 ..." {...on('phone')} />
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > 8 * 1024 * 1024) toast('Фото должно быть не больше 8 МБ');
          else if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) toast('Выберите JPEG, PNG или WebP');
          else if (file) setPhoto(file);
          e.target.value = '';
        }} />
        <button type="button" className="b" style={{ width: '100%', marginBottom: 10 }} onClick={() => photoInput.current?.click()}>{photo ? photo.name : '+ Добавить фото'}</button>
        {photo && <button type="button" className="b" style={{ width: '100%', marginBottom: 10 }} onClick={() => setPhoto(null)}>Убрать фото</button>}
        <div className="note" style={{ padding: '0 0 12px', textAlign: 'left' }}>Реклама всегда помечается «Реклама». Стоимость называет менеджер после заявки.</div>
        <button className="b p" style={{ width: '100%' }} disabled={busy}>{busy ? 'Отправка…' : 'Отправить заявку'}</button>
      </form>
    </div>
  );
}
