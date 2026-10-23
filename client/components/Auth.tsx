import { useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { api, type User } from '../api';
import { CarArt } from '../CarArt';
import { Brand } from './Brand';
export function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ user: User; token: string }>(
        register ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
            ...(register ? { name: form.get('name') } : {}),
          }),
        },
      );
      sessionStorage.setItem('forecourt-token', result.token);
      onLogin(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <div className="eyebrow light">
            <span /> A BETTER WAY TO DRIVE
          </div>
          <h1>
            Good cars.
            <br />
            Great beginnings.
          </h1>
          <p>
            A considered collection. A clearer view.
            <br />
            Your next chapter starts at Forecourt.
          </p>
        </div>
        <div className="auth-art">
          <div className="art-sun" />
          <CarArt hero color="#ced6b8" />
          <span className="auth-art-caption">THE ROAD AHEAD IS YOURS.</span>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={17} /> Thoughtfully selected. Ready for the road.
        </div>
      </section>
      <section className="auth-form-section">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="overline">WELCOME TO FORECOURT</span>
          <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'Create your account and find what moves you.'
              : 'Sign in to explore your next possibility.'}
          </p>
          <form onSubmit={submit} className="auth-form flex flex-col">
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                placeholder={register ? 'At least 10 characters' : 'Enter your password'}
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button disabled={busy} className="primary full" type="submit">
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Forecourt?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Sign in instead' : 'Create account'}
            </button>
          </p>
          <div className="auth-note">
            <ShieldCheck size={18} />
            <p>
              Your next drive, in good hands.
              <br />
              <span>Secure access to our vehicle collection.</span>
            </p>
          </div>
        </div>
        <span className="auth-bottom">
          FORECOURT © {new Date().getFullYear()} <span>MADE FOR THE JOURNEY</span>
        </span>
      </section>
    </main>
  );
}
