import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, MapPin, BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    city: '',
    bio: '',
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.bio.length < 10) {
      toast.error('Bio must be at least 10 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Welcome to SkillRent!');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AppShell showFooter={false}>
      <div className="mx-auto max-w-xl px-6 py-10 md:py-16">
        <Card className="p-8 sr-anim-fade-up">
          <div className="text-center mb-6">
            <div className="inline-flex mb-3"><Logo to={null} showText={false} size={44} /></div>
            <h1 className="font-display text-2xl font-bold">Create your account</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Join the skill economy in a minute.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <User size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input label="Full name" className="pl-9" value={form.name} onChange={update('name')} required minLength={2} placeholder="Jane Doe" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
                <Input label="Email" type="email" className="pl-9" value={form.email} onChange={update('email')} required placeholder="you@example.com" />
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
                <Input label="Password" type="password" className="pl-9" value={form.password} onChange={update('password')} required minLength={6} placeholder="Min 6 characters" />
              </div>
            </div>

            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input label="City" className="pl-9" value={form.city} onChange={update('city')} required minLength={2} placeholder="Berlin" />
            </div>

            <div className="relative">
              <BookOpen size={14} className="absolute left-3 top-[20px]" style={{ color: 'var(--text-dim)' }} />
              <Input
                label="Short bio"
                as="textarea"
                rows={3}
                className="pl-9 pt-2"
                value={form.bio}
                onChange={update('bio')}
                required
                minLength={10}
                placeholder="Tell us a bit about yourself (min 10 chars)"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Create account <ArrowRight size={14} />
            </Button>
          </form>

          <p className="text-xs text-center mt-4" style={{ color: 'var(--text-dim)' }}>
            <Sparkles size={12} className="inline text-indigo-300" /> By signing up you accept our Terms & Privacy.
          </p>

          <div className="sr-divider my-6" />

          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="sr-link font-medium">Sign in</Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
