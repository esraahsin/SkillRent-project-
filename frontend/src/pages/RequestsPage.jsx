import { useEffect, useState } from 'react';
import { Plus, Inbox } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import RequestCard from '../components/features/RequestCard';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function RequestsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('open');
  const [requests, setRequests] = useState([]);
  const [taxonomy, setTaxonomy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Tech & Development',
    subcategory: 'Web Development',
    urgency: 'within today',
    budget: '',
  });

  useEffect(() => {
    api('/taxonomy').then((d) => setTaxonomy(d.taxonomy)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = tab === 'mine' ? '?mine=true' : tab === 'applied' ? '?applied=true' : '';
      const { requests: list } = await api(`/requests${params}`);
      setRequests(list);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  const subcats = taxonomy.find((t) => t.category === form.category)?.subcategories || [];

  async function submitCreate() {
    try {
      await api('/requests', {
        method: 'POST',
        body: {
          ...form,
          budget: form.budget ? Number(form.budget) : undefined,
        },
      });
      toast.success('Request posted!');
      setCreateOpen(false);
      setForm({ title: '', description: '', category: 'Tech & Development', subcategory: 'Web Development', urgency: 'within today', budget: '' });
      setTab('mine');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function apply(req) {
    try {
      await api(`/requests/${req.id}/apply`, { method: 'POST' });
      toast.success('Applied!');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function accept(req) {
    try {
      const applicant = req.applicants?.find((a) => a.status === 'applied');
      if (!applicant) return toast.info('No applicant to accept yet');
      await api(`/requests/${req.id}/accept`, { method: 'POST', body: { providerId: applicant.userId } });
      toast.success('Session created!');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Requests</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Post a need or answer one.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> Post a request
          </Button>
        </div>

        <div className="flex gap-1 mb-5 sr-card !p-1 w-fit">
          {['open', 'mine', 'applied'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm transition ${tab === t ? 'bg-indigo-500/20 text-white' : 'hover:bg-white/5'}`}
              style={tab !== t ? { color: 'var(--text-muted)' } : {}}
            >
              {t === 'open' ? 'Open' : t === 'mine' ? 'My requests' : 'Applied'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox size={28} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {tab === 'mine' ? 'You have no requests yet.' : 'No open requests in this filter.'}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((r) => {
              const isOwn = r.seekerId === user?.id;
              const hasApplied = r.applicants?.some((a) => a.userId === user?.id);
              return (
                <RequestCard
                  key={r.id}
                  request={r}
                  isOwn={isOwn}
                  canApply={!isOwn && r.status === 'open' && !hasApplied}
                  canAccept={isOwn && r.status === 'open' && (r.applicants?.length || 0) > 0}
                  onApply={apply}
                  onAccept={accept}
                />
              );
            })}
          </div>
        )}
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Post a new request">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input
            label="Description"
            as="textarea"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe what you need help with"
          />
          <div className="grid md:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => {
                const first = taxonomy.find((t) => t.category === e.target.value)?.subcategories[0] || '';
                setForm({ ...form, category: e.target.value, subcategory: first });
              }}
              options={taxonomy.map((t) => t.category)}
            />
            <Select
              label="Subcategory"
              value={form.subcategory}
              onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
              options={subcats}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Select
              label="Urgency"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              options={['immediate', 'within today', 'within 3 days']}
            />
            <Input
              label="Budget ($) optional"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Post</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
