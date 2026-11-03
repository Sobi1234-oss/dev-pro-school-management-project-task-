import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { FormError } from '../components/ui/States';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      await login(form.email.trim(), form.password);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="ruled-light relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-bus font-display text-xl font-extrabold text-ink">P</span>
          <span className="font-display text-lg font-bold">ProDev Academy</span>
        </div>
        <div>
          <h1 className="max-w-md font-display text-5xl font-extrabold leading-[1.05]">The register, the report card and the fee book. One place.</h1>
          <p className="mt-5 max-w-sm text-ink-300">Built for local academies that are done with paper notebooks and WhatsApp reminders.</p>
        </div>
        <p className="text-sm text-ink-300">© {new Date().getFullYear()} ProDev Pakistan Software Company</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink font-display text-xl font-extrabold text-bus">P</span>
            <span className="font-display text-lg font-bold">ProDev Academy</span>
          </div>
          <h2 className="text-3xl font-extrabold">Sign in</h2>
          <p className="mt-1 text-sm text-ink/60">Admins and parents use the same door.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <FormError>{error}</FormError>
            <Input label="Email" type="email" autoComplete="username" required value={form.email} error={fields.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
            <div className="relative">
              <Input label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={form.password} error={fields.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-11" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-[2.1rem] rounded p-1.5 text-ink/50 hover:text-ink">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <Button type="submit" variant="accent" loading={busy} className="w-full" disabled={!form.email || !form.password}>Sign in</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
