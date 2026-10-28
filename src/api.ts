import type { Filters, Item, Session } from './types';
import { DEMO_ADS, DEMO_BANNERS, DEMO_WEB } from './demo';

const normalizeBase = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';

  const hasProtocol = /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//');
  const base = hasProtocol ? trimmed : /^\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const BASE: string = normalizeBase(import.meta.env.VITE_API_URL ?? '/api');
export const DEMO = import.meta.env.VITE_DEMO === 'true';
export const FEATURES = {
  aiImages: import.meta.env.VITE_AI_IMAGES === 'true',
  imageSearch: import.meta.env.VITE_IMAGE_SEARCH === 'true',
};

// Токен хранится только в памяти страницы (не в localStorage), чтобы его не мог прочитать чужой скрипт.
// После перезагрузки нужен повторный вход, либо backend должен выдавать httpOnly-cookie (credentials: 'include').
let token: string | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<{ access_token: string; refresh_token: string } | null> | null = null;
export const setToken = (t: string | null, refresh?: string | null) => {
  token = t;
  if (refresh !== undefined) refreshToken = refresh;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function refreshSession() {
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    const currentRefreshToken = refreshToken;
    refreshInFlight = (async () => {
      try {
        const response = await fetch(BASE + '/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentRefreshToken }),
          credentials: 'include',
        });
        if (!response.ok) return null;
        const pair = await response.json() as { access_token: string; refresh_token: string };
        setToken(pair.access_token, pair.refresh_token);
        return pair;
      } catch {
        return null;
      }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}
export async function updateMe(data: { full_name: string; phone: string }): Promise<{ full_name: string | null; phone: string | null }> {
  if (DEMO) return { full_name: data.full_name, phone: data.phone };
  return req<{ full_name: string | null; phone: string | null }>('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
}
export async function fetchProfile(): Promise<{ full_name: string | null; phone: string | null }> {
  return req<{ full_name: string | null; phone: string | null }>('/users/me');
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (DEMO) throw new ApiError(501, 'Смена пароля недоступна в демо-режиме.');
  const pair = await req<{ access_token: string; refresh_token: string }>('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  setToken(pair.access_token, pair.refresh_token);
}
export interface NotificationPreferences {
  new_listings_by_category: boolean;
  new_objects_in_city: boolean;
  saved_price_change: boolean;
  inquiry_replies: boolean;
  booking_updates: boolean;
  booking_reminders: boolean;
}
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  if (DEMO) return { new_listings_by_category: true, new_objects_in_city: true, saved_price_change: true, inquiry_replies: false, booking_updates: false, booking_reminders: false };
  return req<NotificationPreferences>('/users/me/notifications');
}
export async function updateNotificationPreferences(data: NotificationPreferences): Promise<NotificationPreferences> {
  if (DEMO) return data;
  return req<NotificationPreferences>('/users/me/notifications', { method: 'PATCH', body: JSON.stringify(data) });
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const send = () => fetch(BASE + path, { ...init, headers, credentials: 'include' });
  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте соединение и попробуйте ещё раз.');
  }
  if (
    res.status === 401 &&
    refreshToken &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/logout')
  ) {
    const pair = await refreshSession();
    if (pair) {
      headers.set('Authorization', `Bearer ${pair.access_token}`);
      try { res = await send(); } catch { setToken(null, null); }
    } else {
      setToken(null, null);
    }
  }
  if (!res.ok) {
    let msg = 'Не удалось выполнить запрос';
    try {
      const j = await res.json();
      if (typeof j.detail === 'string') msg = j.detail;
      else if (Array.isArray(j.detail)) msg = j.detail.map((e: { msg?: string }) => e.msg).filter(Boolean).join(', ') || msg;
    } catch { /* response may not contain JSON */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Авторизация ---------- */
export async function login(email: string, password: string): Promise<Session> {
  if (DEMO) { await sleep(700); const n = email.split('@')[0]; return { kind: 'user', name: n.charAt(0).toUpperCase() + n.slice(1) }; }
  const r = await req<{ access_token: string; refresh_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(r.access_token, r.refresh_token);
  return fetchMe();
}
export async function register(name: string, email: string, password: string): Promise<Session> {
  if (DEMO) { await sleep(700); return { kind: 'user', name }; }
  await req('/auth/register', { method: 'POST', body: JSON.stringify({ full_name: name, email, password }) });
  return login(email, password);
}
export async function fetchMe(): Promise<Session> {
  const u = await req<{ full_name?: string; name?: string; email: string }>('/users/me');
  return { kind: 'user', name: u.full_name ?? u.name ?? u.email };
}
export async function requestPasswordReset(_email: string): Promise<void> {
  if (DEMO) throw new ApiError(501, 'Сброс пароля недоступен в демо-режиме.');
  await req('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email: _email }),
  });
}
export async function confirmPasswordReset(tokenValue: string, password: string): Promise<void> {
  await req('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token: tokenValue, password }),
  });
}
export async function logout(): Promise<void> {
  try {
    if (!DEMO && refreshToken) {
      await req('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
    }
  } catch {
    // The local session is cleared even when the server cannot be reached.
  } finally {
    setToken(null, null);
  }
}

/* ---------- Объявления ---------- */
const POS = ['30% 82%', '92% 58%', '50% 28%', '70% 100%'];
// Поля подберите под реальную схему ListingOut.
export function toItem(r: any, i = 0): Item {
  const city = r.city?.name ?? r.city;
  const country = r.city?.country?.name ?? r.country?.name ?? r.country ?? '';
  const rawPhoto = r.photo_url ?? r.photos?.[0]?.url;
  const photo = typeof rawPhoto === 'string' && rawPhoto.startsWith('/')
    ? `${BASE.replace(/\/api$/, '')}${rawPhoto}`
    : rawPhoto;
  return {
    id: String(r.id), kind: 'ads',
    tag: r.category?.name ?? r.category ?? 'Объявление',
    title: r.title ?? 'Без названия',
    place: [city, country].filter(Boolean).join(', '),
    country,
    description: r.description ?? '',
    price: r.price != null ? `${Number(r.price).toLocaleString('ru-RU')} ${r.currency ?? 'сом'}` : 'Цена не указана',
    pos: r.photos?.[0]?.url ? '' : POS[i % POS.length],
    photo,
    url: r.url ?? r.link,
    status: r.is_active === false || (r.status != null && r.status !== 'active') ? 'Недоступно' : 'Доступно',
    dealType: r.kind,
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU') : undefined,
    phone: r.contact_phone ?? r.phone,
  };
}
const parsePrice = (s?: string): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[^\d]/g, '').replace(/\s+/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const match = (x: Item, q: string, f: Filters) => {
  const min = f.priceMin ? parsePrice(f.priceMin) : null;
  const max = f.priceMax ? parsePrice(f.priceMax) : null;
  const price = parsePrice(x.price);
  const title = String(x.title ?? '').toLowerCase();
  const place = String(x.place ?? '').toLowerCase();

  return (
    (!q || title.includes(q.toLowerCase())) &&
    (!f.city || place.includes(f.city.toLowerCase())) &&
    (!f.country || x.country === f.country) &&
    (min === null || price === null || price >= min) &&
    (max === null || price === null || price <= max) &&
    (!f.onlyAvailable || x.kind === 'web' || x.status === 'Доступно')
  );
};

export async function getListings(p: { q: string; filters: Filters; mine?: boolean }): Promise<Item[]> {
  if (DEMO) { await sleep(250); return DEMO_ADS.filter((x) => match(x, p.q, p.filters)); }
  const s = new URLSearchParams();
  if (p.q) s.set('q', p.q);
  if (p.filters.city) s.set('city', p.filters.city);
  if (p.filters.country) s.set('country', p.filters.country);
  if (p.filters.priceMin) s.set('min_price', p.filters.priceMin);
  if (p.filters.priceMax) s.set('max_price', p.filters.priceMax);
  if (p.filters.dealType) s.set('kind', p.filters.dealType);
  if (p.mine) s.set('mine', 'true');
  const data = await req<any[] | { items: any[] }>(`/listings/?${s}`);
  const rows = Array.isArray(data) ? data : data.items;
  return rows.map(toItem).filter((x) => !p.filters.onlyAvailable || x.status === 'Доступно');
}
export async function createListing(body: {
  [key: string]: string;
}, photoFile?: File): Promise<void> {
  if (DEMO) { await sleep(500); return; }
  const [cities, categories] = await Promise.all([
    req<{ id: number; name: string; country_id: number }[]>('/cities/'),
    req<{ id: number; name: string }[]>('/categories/'),
  ]);
  const matches = cities.filter((x) => x.name.localeCompare(body.city.trim(), undefined, { sensitivity: 'accent' }) === 0);
  if (matches.length !== 1) {
    throw new ApiError(422, matches.length ? 'Нашлось несколько городов с таким названием. Уточните город.' : 'Такого города нет в каталоге backend.');
  }
  const category = categories.find((x) => x.name.localeCompare(body.category.trim(), undefined, { sensitivity: 'accent' }) === 0);
  if (!category) throw new ApiError(422, 'Выбранной категории нет в каталоге backend.');
  const price = Number(body.price.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) throw new ApiError(422, 'Введите корректную цену.');
  const photo_url = photoFile ? (await uploadImage(photoFile)).url : null;
  const listing = await req<{ id: number }>('/listings/', {
    method: 'POST',
    body: JSON.stringify({
      title: body.title.trim(),
      description: body.description,
      kind: body.kind,
      contact_phone: body.phone || null,
      photo_url,
      price,
      currency: 'KGS',
      category_id: category.id,
      city_id: matches[0].id,
    }),
  });
  await req(`/listings/${listing.id}/publish`, { method: 'POST' });
}
export async function updateListing(id: string, body: Record<string, string>, photoFile?: File, removePhoto = false): Promise<void> {
  if (DEMO) return;
  const [cities, categories] = await Promise.all([
    req<{ id: number; name: string }[]>('/cities/'),
    req<{ id: number; name: string }[]>('/categories/'),
  ]);
  const cityMatches = cities.filter((x) => x.name.localeCompare(body.city.trim(), undefined, { sensitivity: 'accent' }) === 0);
  if (cityMatches.length !== 1) {
    throw new ApiError(422, cityMatches.length ? 'Нашлось несколько городов с таким названием. Уточните город.' : 'Такого города нет в каталоге backend.');
  }
  const city = cityMatches[0];
  const category = categories.find((x) => x.name.localeCompare(body.category.trim(), undefined, { sensitivity: 'accent' }) === 0);
  if (!city) throw new ApiError(422, 'Такого города нет в каталоге backend.');
  if (!category) throw new ApiError(422, 'Выбранной категории нет в каталоге backend.');
  const price = Number(body.price.replace(/\s/g, '').replace(',', '.'));
  if (!body.price.trim() || !Number.isFinite(price) || price < 0) throw new ApiError(422, 'Введите корректную цену.');
  const changes: Record<string, unknown> = {
    title: body.title.trim(),
    description: body.description,
    kind: body.kind,
    contact_phone: body.phone || null,
    price,
    category_id: category.id,
    city_id: city.id,
  };
  if (photoFile) changes.photo_url = (await uploadImage(photoFile)).url;
  else if (removePhoto) changes.photo_url = null;
  await req(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}
export async function uploadImage(file: File): Promise<{ url: string }> {
  return req<{ url: string }>('/uploads/images', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  });
}
export async function deactivateListing(id: string): Promise<void> {
  if (DEMO) return;
  await req(`/listings/${id}/deactivate`, { method: 'POST' });
}
export async function publishListing(id: string): Promise<void> {
  if (DEMO) return;
  await req(`/listings/${id}/publish`, { method: 'POST' });
}
export async function deleteListing(id: string): Promise<void> {
  if (DEMO) return;
  await req(`/listings/${id}`, { method: 'DELETE' });
}

/* ---------- Поиск в интернете ---------- */
async function encodeImage(file: File): Promise<{ image_base64: string; image_mime_type: string }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new ApiError(415, 'Выберите JPEG, PNG или WebP.');
  }
  if (file.size > 8 * 1024 * 1024) throw new ApiError(413, 'Фото должно быть не больше 8 МБ.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return { image_base64: btoa(binary), image_mime_type: file.type };
}
export async function searchWeb(q: string, f: Filters, image?: File): Promise<Item[]> {
  if (DEMO) { await sleep(250); return DEMO_WEB.filter((x) => match(x, q, f)); }
  const imageData = image ? await encodeImage(image) : {};
  const payload = {
    country: f.country || undefined,
    city: f.city || undefined,
    price_min: f.priceMin || undefined,
    price_max: f.priceMax || undefined,
    extra: q ? [q] : undefined,
    ...imageData,
  };
  const data = await req<{ items?: any[] }>('/search/', { method: 'POST', body: JSON.stringify(payload) });
  const rows = data.items ?? [];
  return rows.map((r, i) => toItem(r, i)).filter((x) => !f.onlyAvailable || x.status === 'Доступно');
}

/* ---------- Избранное ---------- */
export async function addFavorite(id: string) { if (!DEMO) await req(`/favorites/${id}`, { method: 'POST' }); }
export async function removeFavorite(id: string) { if (!DEMO) await req(`/favorites/${id}`, { method: 'DELETE' }); }
export async function getFavorites(): Promise<Item[]> {
  if (DEMO) return [];
  const rows = await req<any[]>('/favorites/');
  return rows.map((r, i) => toItem(r.listing ?? r, i));
}

/* ---------- AI ---------- */
export interface AiReply { text: string; items: Item[]; sources: string[]; demo: boolean }
export async function aiChat(message: string, conversationId?: string, image?: File): Promise<AiReply & { conversationId?: string }> {
  if (DEMO) {
    await sleep(1800);
    return { text: `Вот что нашлось по вашему запросу «${message}». Я сравнил предложения из нескольких источников и отобрал варианты у озера и в горах. Цены и наличие нужно проверить на сайте источника.`, items: DEMO_WEB, sources: ['example-travel.kg', 'example-hotels.com', 'example-stay.kg'], demo: true };
  }
  const imageData = image ? await encodeImage(image) : {};
  const r = await req<{ reply?: string; answer?: string; conversation_id?: string; items?: any[]; sources?: string[] }>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId, ...imageData }),
  });
  return {
    text: r.reply ?? r.answer ?? '',
    items: (r.items ?? []).map(toItem),
    sources: r.sources ?? [],
    demo: false,
    conversationId: r.conversation_id,
  };
}

/* ---------- Каналы уведомлений ---------- */
export interface Channel { id: string; type: 'telegram' | 'whatsapp' }
export async function getChannels(): Promise<Channel[]> {
  if (DEMO) return [];
  const rows = await req<any[]>('/channels/');
  return rows.map((r) => ({ id: String(r.id), type: r.type ?? r.channel }));
}
export async function linkTelegram(): Promise<string | undefined> {
  if (DEMO) throw new ApiError(501, 'В демо-режиме Telegram не подключается.');
  const r = await req<{ link?: string; url?: string }>('/channels/telegram/link', { method: 'POST' });
  return r.link ?? r.url;
}
export async function linkWhatsapp(phone: string): Promise<{ challengeId: string }> {
  if (DEMO) throw new ApiError(501, 'В демо-режиме WhatsApp не подключается.');
  const r = await req<{ challenge_id: string }>('/channels/whatsapp/link', { method: 'POST', body: JSON.stringify({ phone }) });
  return { challengeId: r.challenge_id };
}
export async function verifyWhatsapp(challengeId: string, code: string): Promise<void> {
  await req('/channels/whatsapp/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
}
export async function unlinkChannel(id: string): Promise<void> { await req(`/channels/${id}`, { method: 'DELETE' }); }

/* ---------- Реклама ---------- */
export async function getBanner(): Promise<Item | null> {
  if (DEMO) return DEMO_BANNERS[0];
  const rows = await req<any[]>('/advertising/placements/home');
  return rows[0] ? { ...toItem(rows[0]), kind: 'web' } : null;
}
export async function submitCampaign(body: Record<string, unknown>, photoFile?: File): Promise<void> {
  if (DEMO) { await sleep(500); return; }
  const daysText = String(body.days ?? '');
  const days = Number.parseInt(daysText, 10);
  if (!Number.isInteger(days) || days < 1) throw new ApiError(422, 'Выберите срок размещения.');
  const photo_url = photoFile ? (await uploadImage(photoFile)).url : null;
  const c = await req<{ id: string }>('/advertising/campaigns', {
    method: 'POST',
    body: JSON.stringify({ ...body, days, photo_url }),
  });
  await req(`/advertising/campaigns/${c.id}/submit`, { method: 'POST' });
}
