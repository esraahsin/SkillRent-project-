import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Briefcase, Users, Plus, Trash2, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

const modes = [
  { id: 'seeker', label: 'Find skills', desc: 'I want to hire experts for quick tasks.', icon: UserCheck },
  { id: 'provider', label: 'Offer skills', desc: 'I want to monetize what I know.', icon: Briefcase },
  { id: 'both', label: 'Both', desc: 'Learn, teach, earn — all in one place.', icon: Users },
];

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('both');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [taxonomy, setTaxonomy] = useState([]);
  const [skills, setSkills] = useState([
    { category: 'Tech & Development', subcategory: 'Web Development', description: '', hourlyRate: 20, responseTime: 'within 15 min' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.onboardingDone) {
      navigate('/app/marketplace', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api('/taxonomy').then((d) => setTaxonomy(d.taxonomy)).catch(() => {});
  }, []);

  const addSkill = () => setSkills((prev) => [
    ...prev,
    { category: 'Tech & Development', subcategory: 'Web Development', description: '', hourlyRate: 20, responseTime: 'within 15 min' },
  ]);

  const removeSkill = (i) => setSkills((prev) => prev.filter((_, idx) => idx !== i));

  const updateSkill = (i, k, v) =>
    setSkills((prev) => prev.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  const subcatsFor = (cat) => taxonomy.find((t) => t.category === cat)?.subcategories || [];

  async function submit() {
    setLoading(true);
    try {
      const payload = {
        mode,
        avatarUrl: avatarUrl || null,
        skills: mode === 'seeker' ? [] : skills.filter((s) => s.description.trim().length > 0),
      };
      await api('/onboarding', { method: 'POST', body: payload });
      await refreshUser();
      toast.success('Onboarding complete!');
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  }

  const totalSteps = mode === 'seeker' ? 2 : 3;
  const progress = (step / totalSteps) * 100;

  return (
    <AppShell showFooter={false}>
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#d946ef,#22d3ee)' }}
            />
          </div>
        </div>

        <Card className="p-8 sr-anim-fade-up">
          {step === 1 ? (
            <>
              <h2 className="font-display text-2xl font-bold">How will you use SkillRent?</h2>
              <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>Pick what fits you best — you can change this later.</p>
              <div className="grid md:grid-cols-3 gap-3">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`sr-card p-5 text-left transition relative ${mode === m.id ? 'border-indigo-500 ring-2 ring-indigo-500/40' : 'sr-card-hover'}`}
                  >
                    {mode === m.id ? (
                      <CheckCircle2 size={16} className="absolute top-3 right-3 text-indigo-400" />
                    ) : null}
                    <m.icon size={22} className="text-indigo-300 mb-3" />
                    <div className="font-semibold">{m.label}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(2)}>
                  Next <ArrowRight size={14} />
                </Button>
              </div>
            </>
          ) : null}

          {step === 2 && mode !== 'seeker' ? (
            <>
              <h2 className="font-display text-2xl font-bold">List your skills</h2>
              <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
                <Sparkles size={12} className="inline text-indigo-300" /> Our AI will verify each skill description automatically.
              </p>

              <div className="space-y-4">
                {skills.map((s, i) => (
                  <div key={i} className="sr-card p-4">
                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <Select
                        label="Category"
                        value={s.category}
                        onChange={(e) => {
                          updateSkill(i, 'category', e.target.value);
                          const first = subcatsFor(e.target.value)[0];
                          if (first) updateSkill(i, 'subcategory', first);
                        }}
                        options={taxonomy.map((t) => t.category)}
                      />
                      <Select
                        label="Subcategory"
                        value={s.subcategory}
                        onChange={(e) => updateSkill(i, 'subcategory', e.target.value)}
                        options={subcatsFor(s.category)}
                      />
                    </div>
                    <Input
                      label="Description"
                      as="textarea"
                      rows={2}
                      placeholder="e.g. I build React apps with Tailwind and deploy to Vercel…"
                      value={s.description}
                      onChange={(e) => updateSkill(i, 'description', e.target.value)}
                    />
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <Input
                        label="Hourly rate ($)"
                        type="number"
                        min="1"
                        value={s.hourlyRate}
                        onChange={(e) => updateSkill(i, 'hourlyRate', Number(e.target.value))}
                      />
                      <Select
                        label="Response time"
                        value={s.responseTime}
                        onChange={(e) => updateSkill(i, 'responseTime', e.target.value)}
                        options={['within 5 min', 'within 15 min', 'within 1 hour', 'within 1 day']}
                      />
                    </div>
                    {skills.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSkill(i)}
                        className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSkill}
                  className="sr-btn sr-btn-secondary w-full"
                >
                  <Plus size={14} /> Add another skill
                </button>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)}>
                  Next <ArrowRight size={14} />
                </Button>
              </div>
            </>
          ) : null}

          {(step === 2 && mode === 'seeker') || step === 3 ? (
            <>
              <h2 className="font-display text-2xl font-bold">Almost there</h2>
              <p className="text-sm mt-1 mb-6" style={{ color: 'var(--text-muted)' }}>
                Add an avatar to boost trust. You can skip and do it later.
              </p>
              <Input
                label="Avatar URL (optional)"
                placeholder="https://…"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={() => setStep(mode === 'seeker' ? 1 : 2)}>Back</Button>
                <Button onClick={submit} loading={loading}>Finish onboarding</Button>
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </AppShell>
  );
}
