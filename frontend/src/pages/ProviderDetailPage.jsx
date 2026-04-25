import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, Clock, MapPin, Heart, CheckCircle2, ArrowLeft, MessageSquare } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import TrustGauge from '../components/ui/TrustGauge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatRelative } from '../lib/utils';

export default function ProviderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hireOpen, setHireOpen] = useState(false);
  const [hireSkill, setHireSkill] = useState(null);
  const [hireForm, setHireForm] = useState({ title: '', description: '', urgency: 'within today', budget: '' });
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const d = await api(`/providers/${id}`);
        setData(d);
        if (user) {
          const f = await api('/favorites');
          setIsFav(f.favorites.some((x) => x.id === id));
        }
      } catch (err) {
        toast.error(err.message || 'Not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  async function toggleFav() {
    try {
      if (isFav) {
        await api(`/favorites/${id}`, { method: 'DELETE' });
        setIsFav(false);
        toast.info('Removed from favorites');
      } else {
        await api('/favorites', { method: 'POST', body: { providerId: id } });
        setIsFav(true);
        toast.success('Saved to favorites');
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  function openHire(skill) {
    setHireSkill(skill);
    setHireForm({
      title: `Need help with ${skill.subcategory}`,
      description: '',
      urgency: 'within today',
      budget: '',
    });
    setHireOpen(true);
  }

  async function submitHire() {
    try {
      await api('/requests', {
        method: 'POST',
        body: {
          title: hireForm.title,
          description: hireForm.description,
          category: hireSkill.category,
          subcategory: hireSkill.subcategory,
          urgency: hireForm.urgency,
          budget: hireForm.budget ? Number(hireForm.budget) : undefined,
          targetSkillId: hireSkill.id,
        },
      });
      toast.success('Request sent!');
      setHireOpen(false);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!data) return null;
  const { provider, skills, reviews } = data;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={14} /> Back
        </Button>

        <Card className="p-6 md:p-8 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 10% 10%, rgba(99,102,241,0.35), transparent 40%), radial-gradient(circle at 90% 20%, rgba(217,70,239,0.25), transparent 50%)',
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <Avatar name={provider.name} src={provider.avatarUrl} size={88} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold">{provider.name}</h1>
                {provider.isEmailVerified ? (
                  <Badge tone="green"><CheckCircle2 size={10} /> Verified</Badge>
                ) : null}
                <Badge tone={provider.availabilityStatus === 'available_now' ? 'green' : provider.availabilityStatus === 'busy' ? 'orange' : 'slate'}>
                  {provider.availabilityStatus?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><MapPin size={14} /> {provider.city}</span>
                <span className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400" />
                  {provider.avgRating ? provider.avgRating.toFixed(1) : 'New'} · {provider.completedSessions} sessions
                </span>
              </div>
              <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>{provider.bio}</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {provider.trustScore ? (
                <TrustGauge value={provider.trustScore.value} band={provider.trustScore.band} />
              ) : null}
              {user && user.id !== provider.id ? (
                <Button variant={isFav ? 'secondary' : 'ghost'} size="sm" onClick={toggleFav}>
                  <Heart size={14} className={isFav ? 'fill-red-400 text-red-400' : ''} /> {isFav ? 'Saved' : 'Save'}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold mb-3">Skills offered</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {skills.map((s) => (
              <Card key={s.id} hover className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="brand">{s.subcategory}</Badge>
                      {s.isVerified ? <Badge tone="cyan"><CheckCircle2 size={10} /> AI-verified</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                      <span className="flex items-center gap-1"><Clock size={12} /> {s.responseTime}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-xl font-bold sr-gradient-text">{formatCurrency(s.hourlyRate)}</div>
                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>/hour</div>
                  </div>
                </div>
                {user && user.id !== provider.id ? (
                  <Button size="sm" className="mt-4 w-full" onClick={() => openHire(s)}>
                    <MessageSquare size={14} /> Send request
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold mb-3">Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <Card className="p-6 text-sm" style={{ color: 'var(--text-muted)' }}>No reviews yet.</Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <Card key={r.id} className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={r.reviewer?.name} src={r.reviewer?.avatarUrl} size={36} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{r.reviewer?.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{formatRelative(r.createdAt)}</div>
                    </div>
                    <div className="flex gap-0.5 text-yellow-400">
                      {[...Array(r.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{r.comment}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={hireOpen} onClose={() => setHireOpen(false)} title={`Hire ${provider.name}`}>
        <div className="space-y-3">
          <Input label="Title" value={hireForm.title} onChange={(e) => setHireForm({ ...hireForm, title: e.target.value })} />
          <Input
            label="Describe your task"
            as="textarea"
            rows={4}
            value={hireForm.description}
            onChange={(e) => setHireForm({ ...hireForm, description: e.target.value })}
          />
          <div className="grid md:grid-cols-2 gap-3">
            <Select
              label="Urgency"
              value={hireForm.urgency}
              onChange={(e) => setHireForm({ ...hireForm, urgency: e.target.value })}
              options={['immediate', 'within today', 'within 3 days']}
            />
            <Input
              label="Budget ($) optional"
              type="number"
              value={hireForm.budget}
              onChange={(e) => setHireForm({ ...hireForm, budget: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setHireOpen(false)}>Cancel</Button>
            <Button onClick={submitHire}>Send request</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
