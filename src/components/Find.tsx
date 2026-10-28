import { useEffect, useRef, useState } from 'react';
import { DEMO, FEATURES, getBanner, getListings, searchWeb } from '../api';
import { useSpeech } from '../hooks/useSpeech';
import { useToast } from '../toast';
import type { Filters, Item, Kind } from '../types';
import { AdBanner, ListingCard } from './Cards';
import { Icon, Logo } from './Icon';

interface Props {
  cat: Kind;
  setCat: (k: Kind) => void;
  filters: Filters;
  saved: Set<string>;
  onSave: (x: Item) => void;
  onOpen: (x: Item, ad?: boolean) => void;
  onLoaded: (items: Item[]) => void;
  openSheet: (s: 'filters' | 'ideas' | 'ai') => void;
}

const BASE_CHIPS: Record<Kind, string[]> = {
  web: ['Все', 'Отели', 'Гостевые дома', 'Коттеджи'],
  ads: ['Все', 'Квартиры', 'Дома', 'Гостевые дома'],
};

export default function Find({
  cat,
  setCat,
  filters,
  saved,
  onSave,
  onOpen,
  onLoaded,
  openSheet,
}: Props) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('Все');
  const [photo, setPhoto] = useState<string>();
  const [photoFile, setPhotoFile] = useState<File>();
  const [state, setState] = useState<{
    loading: boolean;
    error: string;
    items: Item[];
  }>({
    loading: true,
    error: '',
    items: [],
  });
  const [banner, setBanner] = useState<Item | null>(null);
  const [retry, setRetry] = useState(0);

  const file = useRef<HTMLInputElement>(null);
  const voice = useSpeech(setQ, toast);
  const filtered = !!(
    filters.country ||
    filters.city ||
    filters.priceMin ||
    filters.priceMax ||
    filters.onlyAvailable ||
    filters.dealType
  );

  useEffect(() => {
    let live = true;

    void getBanner()
      .then((item) => {
        if (live) setBanner(item);
      })
      .catch((e: Error) => {
        if (live) toast(e.message);
      });

    return () => {
      live = false;
    };
  }, [toast]);

  useEffect(() => {
    let live = true;

    setState((s) => ({
      ...s,
      loading: true,
      error: '',
    }));

    const timer = window.setTimeout(() => {
      const request =
        cat === 'web'
          ? searchWeb(q, filters, photoFile)
          : getListings({ q, filters });

      request
        .then((items) => {
          if (live) {
            setState({
              loading: false,
              error: '',
              items,
            });
            onLoaded(items);
          }
        })
        .catch((e: unknown) => {
          if (live) {
            const message =
              e instanceof Error
                ? e.message
                : 'Не удалось загрузить результаты. Попробуйте ещё раз.';

            setState({
              loading: false,
              error: message,
              items: [],
            });
          }
        });
    }, q ? 300 : 0);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [cat, q, filters, photoFile, retry, onLoaded]);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  const base = BASE_CHIPS[cat];
  const chips = [
    ...base,
    ...Array.from(new Set(state.items.map((item) => item.tag))).filter(
      (tag) => tag && !base.includes(tag),
    ),
  ];

  const list = state.items.filter(
    (item) => chip === 'Все' || item.tag === chip,
  );

  return (
    <>
      <header className="hd">
        <div className="brand">
          <Logo />
          Kochmon AI
        </div>

        <div className="ttl">Найди место для отдыха</div>

        <div className="srow">
          <div className="sb">
            <Icon n="s" />

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                cat === 'web'
                  ? 'Отель, город или страна'
                  : 'Поиск по объявлениям'
              }
              aria-label="Поиск"
            />

            <button
              className={'ib' + (voice.on ? ' rec' : '')}
              aria-label="Голосовой ввод"
              onClick={voice.toggle}
            >
              <Icon n="m" />
            </button>

            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];

                if (selectedFile && !['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
                  toast('Выберите JPEG, PNG или WebP');
                } else if (selectedFile && selectedFile.size > 8 * 1024 * 1024) {
                  toast('Фото должно быть не больше 8 МБ');
                } else if (selectedFile) {
                  setPhoto(URL.createObjectURL(selectedFile));
                  setPhotoFile(selectedFile);
                }

                e.target.value = '';
              }}
            />

            <button
              className="ib"
              aria-label="Поиск по фото"
              disabled={!FEATURES.imageSearch || cat !== 'web'}
              title={
                FEATURES.imageSearch
                  ? cat === 'web' ? 'Поиск по фото' : 'Переключитесь на интернет-поиск'
                  : 'Поиск по фото скоро появится'
              }
              onClick={() => file.current?.click()}
            >
              <Icon n="c" />
            </button>
          </div>

          <button
            className="fi"
            aria-label="Фильтры"
            onClick={() => openSheet('filters')}
          >
            <Icon n="f" size={22} />
            {filtered && <i className="dot" />}
          </button>

          <button
            className="fi g"
            aria-label="Идеи и колесо стран"
            onClick={() => openSheet('ideas')}
          >
            <Icon n="d" size={22} />
          </button>
        </div>

        {photo && (
          <div className="pchip">
            <img src={photo} alt="" />
            <span>Поиск по фото</span>

            <button
              className="ib"
              aria-label="Убрать фото"
              style={{ width: 26, height: 26 }}
              onClick={() => { setPhoto(undefined); setPhotoFile(undefined); }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="cats">
          <button
            className={'cat' + (cat === 'web' ? ' on' : '')}
            onClick={() => {
              setCat('web');
              setChip('Все');
            }}
          >
            Поиск в интернете
          </button>

          <button
            className={'cat' + (cat === 'ads' ? ' on' : '')}
            onClick={() => {
              setCat('ads');
              setChip('Все');
            }}
          >
            Объявления
          </button>

          <button
            className="aibtn"
            aria-label="AI-помощник"
            onClick={() => openSheet('ai')}
          >
            <Icon n="g" size={17} />
            <span>AI</span>
          </button>
        </div>
      </header>

      <div className="main">
        <div className="res">
          <div className="bar">
            <div className="chips">
              {chips.map((item) => (
                <button
                  key={item}
                  className={'chip' + (chip === item ? ' on' : '')}
                  onClick={() => setChip(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="list">
            {state.loading && (
              <div className="state state-center" role="status">
                Загрузка…
              </div>
            )}

            {!state.loading && state.error && (
              <div className="state state-error" role="alert">
                <p>{state.error}</p>

                <button
                  className="b p"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Повторить
                </button>
              </div>
            )}

            {!state.loading &&
              !state.error &&
              banner &&
              list.length > 0 && (
                <AdBanner
                  x={banner}
                  onOpen={() => onOpen(banner, true)}
                />
              )}

            {!state.loading &&
              !state.error &&
              list.map((item) => (
                <ListingCard
                  key={item.id}
                  x={item}
                  saved={saved.has(item.id)}
                  onOpen={() => onOpen(item)}
                  onSave={() => onSave(item)}
                />
              ))}

            {!state.loading &&
              !state.error &&
              list.length === 0 && (
                <div className="state state-empty" role="status">
                  Ничего не найдено. Измените фильтры.
                </div>
              )}
          </div>

          {DEMO && (
            <div className="note">
              Демо-данные. В рабочей версии результаты приходят из backend и интернет-источников.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
