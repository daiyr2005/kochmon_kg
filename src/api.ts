import type { Filters, Item, Session } from './types';
import { DEMO_ADS, DEMO_BANNERS, DEMO_WEB } from './demo';

const normalizeBase = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
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
export const setToken = (t: string | null) => { token = t; };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте соединение и попробуйте ещё раз.');
  }
  if (!res.ok) {
    let msg = 'Не удалось выполнить запрос';
    try { const j = await res.json(); if (typeof j.detail === 'string') msg = j.detail; } catch { /* ответ без JSON */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Авторизация ---------- */
// ВАЖНО: схема ответа и формат тела (JSON или form-data OAuth2) нужно сверить с вашим FastAPI.
export async function login(email: string, password: string): Promise<Session> {
  if (DEMO) { await sleep(700); const n = email.split('@')[0]; return { kind: 'user', name: n.charAt(0).toUpperCase() + n.slice(1) }; }
  const r = await req<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setToken(r.access_token);
  return fetchMe();
}
export async function register(name: string, email: string, password: string): Promise<Session> {
  if (DEMO) { await sleep(700); return { kind: 'user', name }; }
  await req('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  return login(email, password);
}
export async function fetchMe(): Promise<Session> {
  const u = await req<{ full_name?: string; name?: string; email: string }>('/users/me');
  return { kind: 'user', name: u.full_name ?? u.name ?? u.email };
}
export async function requestPasswordReset(_email: string): Promise<void> {
  throw new ApiError(501, 'Восстановление пароля пока не поддерживается backend.');
}
export async function logout(): Promise<void> {
  try {
    await req('/auth/logout', { method: 'POST' });
  } catch {
    // backend может не поддерживать logout, но в любом случае удаляем токен локально
  }
  setToken(null);
}

/* ---------- Объявления ---------- */
const POS = ['30% 82%', '92% 58%', '50% 28%', '70% 100%'];
// Поля подберите под реальную схему ListingOut.
export function toItem(r: any, i = 0): Item {
  const city = r.city?.name ?? r.city;
  const country = r.country?.name ?? r.country ?? '';
  return {
    id: String(r.id), kind: 'ads',
    tag: r.category?.name ?? r.category ?? 'Объявление',
    title: r.title ?? 'Без названия',
    place: [city, country].filter(Boolean).join(', '),
    country,
    description: r.description ?? '',
    price: r.price != null ? `${Number(r.price).toLocaleString('ru-RU')} ${r.currency ?? 'сом'}` : 'Цена не указана',
    pos: r.photos?.[0]?.url ? '' : POS[i % POS.length],
    photo: r.photos?.[0]?.url,
    status: r.is_active === false || r.status === 'inactive' ? 'Недоступно' : 'Доступно',
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

  return (
    (!q || x.title.toLowerCase().includes(q.toLowerCase())) &&
    (!f.city || x.place.toLowerCase().includes(f.city.toLowerCase())) &&
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
  if (p.filters.priceMin) s.set('price_min', p.filters.priceMin);
  if (p.filters.priceMax) s.set('price_max', p.filters.priceMax);
  if (p.mine) s.set('mine', 'true');
  const data = await req<any[] | { items: any[] }>(`/listings/?${s}`);
  const rows = Array.isArray(data) ? data : data.items;
  return rows.map(toItem).filter((x) => !p.filters.onlyAvailable || x.status === 'Доступно');
}
export async function createListing(body: Record<string, unknown>): Promise<void> {
  if (DEMO) { await sleep(500); return; }
  await req('/listings/', { method: 'POST', body: JSON.stringify(body) }); // загрузки фото в backend пока нет
}
export async function deactivateListing(id: string): Promise<void> {
  if (DEMO) return;
  await req(`/listings/${id}/deactivate`, { method: 'POST' });
}
export async function deleteListing(id: string): Promise<void> {
  if (DEMO) return;
  await req(`/listings/${id}`, { method: 'DELETE' });
}

/* ---------- Поиск в интернете ---------- */
// По вашим данным /search/ ищет только по локальным объявлениям: интернет-поиск нужно сначала сделать на backend.
export async function searchWeb(q: string, f: Filters): Promise<Item[]> {
  if (DEMO) { await sleep(250); return DEMO_WEB.filter((x) => match(x, q, f)); }
  const payload = {
    country: f.country || undefined,
    city: f.city || undefined,
    price_min: f.priceMin || undefined,
    price_max: f.priceMax || undefined,
    extra: q ? [q] : undefined,
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
export async function aiChat(message: string, conversationId?: string): Promise<AiReply & { conversationId?: string }> {
  if (DEMO) {
    await sleep(1800);
    return { text: `Вот что нашлось по вашему запросу «${message}». Я сравнил предложения из нескольких источников и отобрал варианты у озера и в горах. Цены и наличие нужно проверить на сайте источника.`, items: DEMO_WEB, sources: ['example-travel.kg', 'example-hotels.com', 'example-stay.kg'], demo: true };
  }
  const r = await req<{ reply?: string; answer?: string; conversation_id?: string }>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, conversation_id: conversationId }) });
  return { text: r.reply ?? r.answer ?? '', items: [], sources: [], demo: false, conversationId: r.conversation_id };
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
export async function linkWhatsapp(phone: string): Promise<void> {
  if (DEMO) throw new ApiError(501, 'В демо-режиме WhatsApp не подключается.');
  await req('/channels/whatsapp/link', { method: 'POST', body: JSON.stringify({ phone }) });
}
export async function unlinkChannel(id: string): Promise<void> { await req(`/channels/${id}`, { method: 'DELETE' }); }

/* ---------- Реклама ---------- */
export async function getBanner(): Promise<Item | null> {
  if (DEMO) return DEMO_BANNERS[0];
  try {
    const r = await req<any>('/advertising/placements/home');
    const row = Array.isArray(r) ? r[0] : r;
    return row ? { ...toItem(row), kind: 'web' } : null;
  } catch { return null; }
}
export async function submitCampaign(body: Record<string, unknown>): Promise<void> {
  if (DEMO) { await sleep(500); return; }
  const c = await req<{ id: string }>('/advertising/campaigns', { method: 'POST', body: JSON.stringify(body) });
  await req(`/advertising/campaigns/${c.id}/submit`, { method: 'POST' });
}
