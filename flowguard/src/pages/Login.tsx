import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!loginId.trim()) return setError('Please enter your assigned User ID.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    try {
      const ws = await login(loginId.trim(), password);
      nav(ws === 'INSTITUTION' ? '/' : ws === 'GOVERNANCE' ? '/official/rules' : '/official', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3.5 text-[15px] text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-700 focus:outline-none';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 text-white">
      <div className="w-full max-w-[460px]">
        <div className="mb-4 flex justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight">AICTE FlowGuard</h1>
        <p className="mt-2 mb-8 text-center text-sm text-neutral-400">Unified Approval Workflow &amp; Compliance Management Portal</p>

        <form onSubmit={submit} noValidate className="space-y-5">
          <div>
            <label htmlFor="uid" className="mb-2 block text-sm font-semibold text-neutral-200">
              User ID
            </label>
            <input id="uid" autoComplete="username" className={field} placeholder="Enter your assigned User ID" value={loginId} onChange={(e) => setLoginId(e.target.value)} disabled={busy} />
          </div>
          <div>
            <label htmlFor="pw" className="mb-2 block text-sm font-semibold text-neutral-200">
              Password
            </label>
            <div className="relative">
              <input
                id="pw"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${field} pr-12`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                aria-label={show ? 'Hide password' : 'Show password'}
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 hover:text-white"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[15px] font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-8 text-center text-xs leading-relaxed text-neutral-500">
          Accounts and roles are assigned by the administrator. Your workspace is selected automatically from the roles verified by the server.
        </p>
      </div>
    </div>
  );
}
