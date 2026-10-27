import type { Item } from './types';

// Демонстрационные данные. Используются ТОЛЬКО при VITE_DEMO=true.
const KG = 'Кыргызстан';

export const DEMO_WEB: Item[] = [
  { id: 'w1', kind: 'web', tag: 'Гостевые дома', title: 'Гостевой дом у озера Сон-Куль', place: 'Нарын, Кыргызстан', country: KG, description: 'Юрты и домики у воды, завтрак включён.', price: 'от 3 500 сом / ночь', source: 'example-travel.kg', pos: '30% 82%', likes: 1280 },
  { id: 'w2', kind: 'web', tag: 'Отели', title: 'Отель с видом на Иссык-Куль', place: 'Чолпон-Ата, Кыргызстан', country: KG, description: 'Номера с балконом, пляж в 200 м.', price: 'от 6 200 сом / ночь', source: 'example-hotels.com', pos: '92% 58%', likes: 2150 },
  { id: 'w3', kind: 'web', tag: 'Коттеджи', title: 'Коттедж в горах Ала-Арча', place: 'Бишкек, Кыргызстан', country: KG, description: 'Дом на 6 гостей, камин, мангальная зона.', price: 'от 9 800 сом / ночь', source: 'example-stay.kg', pos: '50% 28%' },
];

export const DEMO_ADS: Item[] = [
  { id: 'a1', kind: 'ads', tag: 'Квартиры', title: '2-комн. квартира в центре Бишкека', place: 'Бишкек', country: KG, description: 'Евроремонт, рядом парк и метро-остановка.', price: '55 000 сом / мес', status: 'Доступно', date: '20 окт 2026', phone: '+996 700 000 001', pos: '30% 82%' },
  { id: 'a2', kind: 'ads', tag: 'Дома', title: 'Дом с участком, Чолпон-Ата', place: 'Иссык-Куль', country: KG, description: '8 соток, 4 комнаты, 5 минут до пляжа.', price: '12 400 000 сом', status: 'Доступно', date: '18 окт 2026', phone: '+996 700 000 002', pos: '92% 58%', likes: 640 },
  { id: 'a3', kind: 'ads', tag: 'Гостевые дома', title: 'Гостевой дом «Ак-Юрта»', place: 'Каракол', country: KG, description: '6 номеров, завтрак, трансфер от автовокзала.', price: 'от 2 800 сом / ночь', status: 'Недоступно', date: '12 окт 2026', phone: '+996 700 000 003', pos: '50% 28%' },
];

// Рекламные баннеры демо-версии (в рабочем режиме баннер приходит с backend).
export const DEMO_BANNERS: Item[] = [
  { id: 'ad-w2', kind: 'web', tag: 'Отели', title: 'Отель «Иссык-Куль Резорт»', place: 'Чолпон-Ата, Кыргызстан', country: KG, description: 'Номера с видом на озеро', price: 'от 6 200 сом / ночь', source: 'example-hotels.com', pos: '22% 78%' },
  { id: 'ad-w3', kind: 'web', tag: 'Отели', title: 'Бутик-отель «Ала-Тоо»', place: 'Бишкек, Кыргызстан', country: KG, description: 'Горный воздух и камин', price: 'от 9 800 сом / ночь', source: 'example-stay.kg', pos: '50% 28%' },
];

// В демо сразу сохранены две карточки, как в утверждённом макете.
export const DEMO_SAVED = ['w1', 'a1'];

export const WHEEL: [string, string][] = [
  ['Кыргызстан', 'Иссык-Куль'], ['Турция', 'Анталья'], ['ОАЭ', 'Дубай'], ['Грузия', 'Батуми'],
  ['Казахстан', 'Алматы'], ['Узбекистан', 'Самарканд'], ['Таиланд', 'Пхукет'], ['Египет', 'Шарм-эль-Шейх'],
];

export const COUNTRY_OPTIONS = ['', ...WHEEL.map((w) => w[0])];
export const SUGGESTIONS = ['Тихий отель у озера до 5 000 сом', 'Квартира в Бишкеке на неделю', 'Куда поехать в октябре?', 'Юрта с видом на горы'];
