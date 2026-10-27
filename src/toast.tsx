import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Notify = (text: string) => void;
const Ctx = createContext<Notify>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<number>();
  const notify = useCallback((t: string) => {
    setText(t);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 3200);
  }, []);
  return (
    <Ctx.Provider value={notify}>
      {children}
      <div className={'toast' + (show ? ' s' : '')} role="status" aria-live="polite">{text}</div>
    </Ctx.Provider>
  );
}
