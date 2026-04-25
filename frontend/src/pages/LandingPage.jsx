import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Shield,
  Sparkles,
  Users,
  Star,
  Search,
  MessageSquare,
  Handshake,
  Brain,
  Lock,
  Clock,
  ArrowRight,
  CheckCircle2,
  Code2,
  Palette,
  Languages,
  GraduationCap,
  Briefcase,
  Home,
  Heart,
  Music,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { api } from '../api/client';

const categoryIcons = {
  'Tech & Development': Code2,
  'Design & Creativity': Palette,
  'Languages & Translation': Languages,
  'Education & Tutoring': GraduationCap,
  'Business & Finance': Briefcase,
  'Home & Lifestyle': Home,
  'Health & Wellness': Heart,
  'Music & Arts': Music,
};

const features = [
  {
    icon: Brain,
    title: 'AI-verified skills',
    desc: 'Every skill profile is analyzed by AI for clarity and credibility, surfacing the most trustworthy providers first.',
  },
  {
    icon: Zap,
    title: 'Instant matching',
    desc: 'Post a request and get connected to available-now providers in your city in under 5 minutes.',
  },
  {
    icon: Shield,
    title: 'Protected sessions',
    desc: 'Anti-scam rules, anomaly detection and in-session payment blocking keep both sides safe.',
  },
  {
    icon: Clock,
    title: 'Pay for minutes',
    desc: 'Sessions timeboxed and transparent. Only pay for actual time spent, nothing else.',
  },
  {
    icon: Lock,
    title: 'End-to-end trust',
    desc: 'Mutual reviews, live trust scoring and verified skills build a reputation that travels with you.',
  },
  {
    icon: Sparkles,
    title: 'Smart recommendations',
    desc: 'Semantic search finds the right provider for your exact need, not just keyword matches.',
  },
];

const steps = [
  {
    icon: Search,
    title: 'Discover',
    desc: 'Browse providers or post a micro-skill request with urgency and budget.',
  },
  {
    icon: Handshake,
    title: 'Connect',
    desc: 'Providers apply. You pick the right one. A protected session is created instantly.',
  },
  {
    icon: MessageSquare,
    title: 'Collaborate',
    desc: 'Chat live, exchange skills, complete the session and leave mutual reviews.',
  },
];

const testimonials = [
  {
    name: 'Sarah Martinez',
    role: 'UX Designer',
    text: 'I rented a front-end dev for 90 minutes to fix a bug. Done. Paid. Reviewed. That’s how work should feel.',
  },
  {
    name: 'Ahmed Khalil',
    role: 'Student',
    text: 'Got math tutoring two hours before my exam. The AI match gave me exactly the right person.',
  },
  {
    name: 'Linda Chen',
    role: 'Indie founder',
    text: 'SkillRent replaced 3 gig platforms for me. Fast, safe, and the trust score is actually meaningful.',
  },
];

function useCountUp(target, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const step = (t) => {
      const progress = Math.min(1, (t - start) / duration);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Stat({ value, label, suffix = '' }) {
  const n = useCountUp(value);
  return (
    <div className="text-center">
      <div className="font-display text-3xl md:text-4xl font-bold sr-gradient-text">
        {n}{suffix}
      </div>
      <div className="text-xs uppercase tracking-widest mt-1" style={{ color: 'var(--text-dim)' }}>{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState({ totalProviders: 0, totalSessions: 0, averageRating: 0, categories: 8 });
  const [taxonomy, setTaxonomy] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, tx] = await Promise.all([api('/stats/public'), api('/taxonomy')]);
        setStats(s);
        setTaxonomy(tx.taxonomy);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-12 md:pt-20 pb-16 text-center">
        <span className="sr-pill sr-pill-brand sr-anim-fade">
          <Sparkles size={12} /> Hackathon MVP — Phase 1
        </span>
        <h1 className="font-display mt-5 text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] sr-anim-fade-up">
          Your skills have value.<br />
          <span className="sr-gradient-text">Rent them now.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg sr-anim-fade-up" style={{ color: 'var(--text-muted)' }}>
          Instant, local, AI-verified micro-skill exchange. Find a verified expert or earn from the skills you already have — in minutes, not weeks.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 sr-anim-fade-up">
          <Link to="/register">
            <Button size="lg">
              Get started free <ArrowRight size={16} />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="secondary">See how it works</Button>
          </a>
        </div>

        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 sr-anim-fade">
          <Stat value={stats.totalProviders || 8} label="Providers" suffix="+" />
          <Stat value={stats.totalSessions || 12} label="Sessions" suffix="+" />
          <Stat value={Math.round((stats.averageRating || 4.7) * 10) / 10} label="Avg rating" />
          <Stat value={stats.categories || 8} label="Categories" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Built for speed. Engineered for trust.</h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
            A marketplace where every session is verified, timeboxed and protected by cyber-rules.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Card key={i} hover className="p-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(217,70,239,0.25))' }}
              >
                <f.icon size={20} className="text-indigo-300" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Three simple steps.</h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
            From idea to done, without the friction.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => (
            <Card key={i} className="p-6 relative overflow-hidden">
              <div className="absolute top-3 right-4 font-display text-6xl font-bold opacity-10">{i + 1}</div>
              <s.icon size={22} className="text-cyan-300 mb-3" />
              <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Skills for every mission.</h2>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Pick a category — then go deeper.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {taxonomy.map((c) => {
            const Icon = categoryIcons[c.category] || Sparkles;
            return (
              <Card key={c.category} hover className="p-5">
                <Icon size={22} className="text-indigo-300 mb-3" />
                <div className="font-semibold text-sm">{c.category}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  {c.subcategories.length} skills
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Loved by users.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <Card key={i} className="p-6">
              <div className="flex gap-0.5 mb-3 text-yellow-400">
                {[...Array(5)].map((_, k) => <Star key={k} size={14} fill="currentColor" />)}
              </div>
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>"{t.text}"</p>
              <div className="mt-4 text-xs">
                <div className="font-semibold">{t.name}</div>
                <div style={{ color: 'var(--text-dim)' }}>{t.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Card className="relative p-10 md:p-14 text-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(217,70,239,0.25), transparent 50%)',
            }}
          />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-4xl font-bold">Ready to start?</h2>
            <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
              Join now and rent out your first skill — or find an expert for what you need.
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <Link to="/register"><Button size="lg">Create free account</Button></Link>
              <Link to="/login"><Button size="lg" variant="secondary">Sign in</Button></Link>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> Free to join</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> No subscription</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> AI-verified</span>
              <span className="flex items-center gap-1"><Users size={12} className="text-indigo-300" /> Community-driven</span>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
