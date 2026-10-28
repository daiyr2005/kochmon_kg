import { useState, type ReactNode } from 'react';
import { ApiError, BASE, DEMO, confirmPasswordReset, login, register, requestPasswordReset } from '../api';
import type { Session } from '../types';
import { useToast } from '../toast';
import { Logo } from './Icon';

type Form = { name: string; email: string; pass: string; pass2: string; terms: boolean };
const EMPTY: Form = { name: '', email: '', pass: '', pass2: '', terms: false };

function Field({ label, error, children, last }: { label: string; error?: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={'f' + (error ? ' bad' : '')} style={last ? { marginBottom: 14 } : undefined}>
      <label>{label}</label>
      {children}
      <div className="msg">{error}</div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export default function AuthScreen({ onEnter }: { onEnter: (s: Session) => void }) {
  const toast = useToast();
  const resetToken = new URLSearchParams(window.location.search).get('reset_token');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(resetToken ? 'reset' : 'login');
  const [f, setF] = useState<Form>(EMPTY);
  const [err, setErr] = useState<Partial<Record<keyof Form, string>>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [srv, setSrv] = useState('');
  const set = (k: keyof Form, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const reg = mode === 'register';
  const resetting = mode === 'reset';

  function validate() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (reg && f.name.trim().length < 2) e.name = 'Введите имя (минимум 2 символа)';
    if (!resetting && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Введите корректный email, например name@mail.com';
    if (!reg && !resetting) { if (!f.pass) e.pass = 'Введите пароль'; }
    else if (f.pass.length < 8 || !/[A-Za-zА-Яа-я]/.test(f.pass) || !/\d/.test(f.pass)) e.pass = 'Минимум 8 символов, хотя бы одна буква и одна цифра';
    if ((reg || resetting) && (!f.pass2 || f.pass2 !== f.pass)) e.pass2 = 'Пароли не совпадают';
    if (reg && !f.terms) e.terms = 'Необходимо принять условия';
    setErr(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    setSrv('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (resetting) {
        if (!resetToken) throw new ApiError(400, 'Ссылка для сброса пароля недействительна');
        await confirmPasswordReset(resetToken, f.pass);
        window.history.replaceState(null, '', window.location.pathname);
        setMode('login');
        setF(EMPTY);
        toast('Пароль изменён. Теперь войдите с новым паролем.');
      } else {
        const s = reg ? await register(f.name.trim(), f.email.trim(), f.pass) : await login(f.email.trim(), f.pass);
        onEnter(s);
      }
    } catch (e) {
      const a = e as ApiError;
      setSrv(a.status === 401 ? 'Неверный email или пароль' : a.status === 409 ? 'Пользователь с таким email уже существует' : a.message);
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    try {
      await requestPasswordReset(f.email);
      toast('Если аккаунт с таким email существует, инструкция отправлена на почту.');
    } catch (e) { toast((e as Error).message); }
  }

  function google() {
    if (DEMO) return toast('Демо: вход через Google недоступен');
    window.location.href = `${BASE}/auth/google`; // backend сам запускает безопасный OAuth-поток
  }

  return (
    <div id="auth">
      <section className="v bv on">
        <div className="scene" />
        <div className="atop logo"><Logo size={36} id="lga" />Kochmon AI</div>
        <div className="wrap">
          <div className="card">
            <form className="formslot fade" key={mode} noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <h1>{resetting ? 'Новый пароль' : reg ? 'Создайте аккаунт' : 'Добро пожаловать в Kochmon AI'}</h1>
              <p className="sub">{resetting ? 'Придумайте новый пароль для аккаунта.' : reg ? 'Сохраняйте любимые места и пользуйтесь ИИ-поиском.' : 'Найди идеальное место для отдыха с помощью искусственного интеллекта.'}</p>
              {srv && <div className="msg srv" role="alert">{srv}</div>}
              {reg && (
                <Field label="Имя" error={err.name}>
                  <input type="text" autoComplete="name" placeholder="Айгерим" value={f.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
              )}
              {!resetting && <Field label="Email" error={err.email}>
                <input type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={(e) => set('email', e.target.value)} />
              </Field>}
              <Field label="Пароль" error={err.pass}>
                <input type={show ? 'text' : 'password'} autoComplete={reg || resetting ? 'new-password' : 'current-password'} placeholder={reg || resetting ? 'Минимум 8 символов, буква и цифра' : 'Ваш пароль'} value={f.pass} onChange={(e) => set('pass', e.target.value)} />
                <button type="button" className="eye" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow(!show)}>{show ? '🙈' : '👁'}</button>
              </Field>
              {reg || resetting ? (
                <>
                  <Field label="Подтверждение пароля" error={err.pass2}>
                    <input type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Повторите пароль" value={f.pass2} onChange={(e) => set('pass2', e.target.value)} />
                  </Field>
                  {reg && <div className={'f' + (err.terms ? ' bad' : '')}>
                    <label className="chk">
                      <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} />
                      <span>Я принимаю <a href="/terms">условия использования</a> и <a href="/privacy">политику конфиденциальности</a></span>
                    </label>
                    <div className="msg">{err.terms}</div>
                  </div>}
                </>
              ) : (
                <div className="arow"><a href="#forgot" onClick={(e) => { e.preventDefault(); void forgot(); }}>Забыли пароль?</a></div>
              )}
              <button type="submit" className="btn pri" disabled={busy}>
                {busy ? (<><span className="sp" />Подождите…</>) : resetting ? 'Сменить пароль' : reg ? 'Зарегистрироваться' : 'Войти'}
              </button>
              {!resetting && <>
                <div className="div">или</div>
                <button type="button" className="btn gg" onClick={google}><GoogleIcon /> Продолжить с Google</button>
                <div className="sw">
                  {reg ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
                  <button type="button" className="lnk" onClick={() => { setMode(reg ? 'login' : 'register'); setErr({}); setSrv(''); }}>{reg ? 'Войти' : 'Зарегистрироваться'}</button>
                </div>
              </>}
            </form>
          </div>
          {!resetting && <button type="button" className="btn guestbig" onClick={() => onEnter({ kind: 'guest', name: 'Гость' })}>
            Продолжить как гость →
          </button>}
        </div>
      </section>
    </div>
  );
}
