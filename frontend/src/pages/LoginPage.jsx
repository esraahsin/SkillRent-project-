import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const to = user.onboardingDone ? location.state?.from || '/app/marketplace' : '/onboarding';
      navigate(to, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell showFooter={false}>
      <div className="mx-auto max-w-md px-6 py-12 md:py-20">
        <Card className="p-8 sr-anim-fade-up">
          <div className="text-center mb-6">
            <div className="inline-flex mb-3"><Logo to={null} showText={false} size={44} /></div>
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Sign in to continue to SkillRent
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input
                label="Email"
                type="email"
                className="pl-9"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input
                label="Password"
                type="password"
                className="pl-9"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign in <ArrowRight size={14} />
            </Button>
          </form>

          <div className="sr-divider my-6" />

          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            New here?{' '}
            <Link to="/register" className="sr-link font-medium">Create an account</Link>
          </p>

          <div className="mt-6 rounded-xl p-3 text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="font-semibold text-indigo-300 mb-1">Demo accounts</div>
            <div style={{ color: 'var(--text-muted)' }}>
Emails: <code>amira@skillrent.demo</code>, <code>omar@skillrent.demo</code>, <code>nadi@skillrent.demo</code><br />
              Password: <code>password123</code>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
