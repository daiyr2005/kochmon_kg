export type Kind = 'web' | 'ads';

export interface Item {
  id: string;
  kind: Kind;
  tag: string;
  title: string;
  place: string;
  country: string;
  description: string;
  price: string;
  pos: string; // позиция демо-фото; пусто для реальных объявлений
  photo?: string;
  source?: string;
  status?: 'Доступно' | 'Недоступно';
  date?: string;
  phone?: string;
  likes?: number;
}

export interface Session {
  kind: 'guest' | 'user';
  name: string;
}

export interface Filters {
  country: string;
  city: string;
  onlyAvailable: boolean;
  priceMin?: string;
  priceMax?: string;
}

export type Tab = 'find' | 'saved' | 'prof';

export type View =
  | { k: 'item'; id: string; ad?: boolean }
  | { k: 'mine' }
  | { k: 'add' }
  | { k: 'adv' };

export type SheetName = 'filters' | 'ideas' | 'ai' | 'need' | { k: 'confirm'; id: string };
