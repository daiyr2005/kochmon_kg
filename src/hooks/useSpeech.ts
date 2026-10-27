import { useCallback, useRef, useState } from 'react';

// Голос: распознавание речи браузера (Chrome, Edge, Safari). Backend не нужен: текст уходит как обычный запрос.
export function useSpeech(onText: (t: string) => void, onError: (m: string) => void) {
  const ref = useRef<any>(null);
  const [on, setOn] = useState(false);
  const toggle = useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return onError('Голосовой ввод не поддерживается этим браузером. Попробуйте Chrome или Safari.');
    if (ref.current) { ref.current.stop(); return; }
    const r = new Ctor();
    r.lang = 'ru-RU';
    r.interimResults = true;
    r.onresult = (e: any) => { let t = ''; for (const x of e.results) t += x[0].transcript; onText(t); };
    r.onerror = (e: any) => onError(e.error === 'not-allowed' ? 'Разрешите доступ к микрофону в настройках браузера' : 'Не удалось распознать речь');
    r.onend = () => { ref.current = null; setOn(false); };
    ref.current = r;
    setOn(true);
    r.start();
  }, [onText, onError]);
  return { on, toggle };
}
