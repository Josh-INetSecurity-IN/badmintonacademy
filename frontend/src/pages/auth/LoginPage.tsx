import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, Mail, Lock, ArrowRight, Trophy, Users, CalendarCheck2, IndianRupee } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { handleError } from '@/services/api';
import { Button } from '@/components/ui/Button';

const HIGHLIGHTS = [
  { icon: Users, label: 'Students, batches & attendance' },
  { icon: CalendarCheck2, label: 'Court scheduling & bookings' },
  { icon: IndianRupee, label: 'Fees, payments & reports' },
  { icon: Trophy, label: 'Tournaments & website content' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(handleError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative flex overflow-hidden bg-brand-gradient lg:w-[52%] lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '56px 56px' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sport-500/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex items-center gap-3 p-6 lg:p-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-white">Badminton Academy</p>
            <p className="text-xs font-medium text-white/70">Management System</p>
          </div>
        </div>

        <div className="relative z-10 hidden px-6 lg:block lg:px-0">
          <h1 className="max-w-lg font-display text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.75rem]">
            Run your entire academy from one console.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
            Coaching batches, regular play, court bookings, fees, attendance, sales and tournaments — unified
            in a single operational workspace.
          </p>

          <ul className="mt-10 grid max-w-md grid-cols-1 gap-3.5 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 hidden p-6 text-xs text-white/50 lg:block lg:p-0">
          © {new Date().getFullYear()} Badminton Academy. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 sm:px-8 lg:py-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-display text-base font-bold leading-tight text-slate-900">Badminton Academy</p>
                <p className="text-xs text-slate-500">Management System</p>
              </div>
            </div>
          </div>

          <div className="animate-slide-up">
            <h2 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to your admin console to continue.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="label" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="input h-11 pl-11"
                    placeholder="admin@academy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    className="input h-11 pl-11"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" size="lg" loading={loading} fullWidth className="mt-1">
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Demo credentials</p>
              <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Super Admin</dt>
                  <dd className="font-mono text-slate-800">superadmin@academy.com</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Manager</dt>
                  <dd className="font-mono text-slate-800">manager@academy.com</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Password</dt>
                  <dd className="font-mono text-slate-800">ChangeMe@123</dd>
                </div>
              </dl>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              <Link to="/" className="font-medium text-primary-600 underline-offset-4 hover:underline">
                Back to the public website
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
