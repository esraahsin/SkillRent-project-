import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Zap } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import ProviderCard from '../components/features/ProviderCard';
import Modal from '../components/ui/Modal';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { debounce } from '../lib/utils';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [taxonomy, setTaxonomy] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    subcategory: '',
    minRate: '',
    maxRate: '',
    availability: '',
    city: '',
    sort: 'relevance',
  });
  const [hireModal, setHireModal] = useState(null);
  const [hireForm, setHireForm] = useState({ title: '', description: '', urgency: 'within today', budget: '' });

  useEffect(() => {
    api('/taxonomy').then((d) => setTaxonomy(d.taxonomy)).catch(() => {});
  }, []);

  const runSearch = useMemo(
    () =>
      debounce(async (f) => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          Object.entries(f).forEach(([k, v]) => {
            if (v !== '' && v !== null && v !== undefined) params.set(k, v);
          });
          // FIX: server returns { providers }, not { entries }
          const { providers } = await api(`/providers/search?${params.toString()}`);
          setEntries(providers || []);
        } catch (err) {
          toast.error(err.message || 'Search failed');
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    runSearch(filters);
  }, [filters, runSearch]);

  const subcats = taxonomy.find((t) => t.category === filters.category)?.subcategories || [];

  async function submitHire() {
    try {
      const entry = hireModal;
      const body = {
        title: hireForm.title,
        description: hireForm.description,
        category: entry.category,
        subcategory: entry.subcategory,
        urgency: hireForm.urgency,
        budget: hireForm.budget ? Number(hireForm.budget) : undefined,
        targetSkillId: entry.id,
      };
      await api('/requests', { method: 'POST', body });
      toast.success('Request posted — the provider has been notified!');
      setHireModal(null);
      setHireForm({ title: '', description: '', urgency: 'within today', budget: '' });
    } catch (err) {
      toast.error(err.message || 'Could not post request');
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Marketplace</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Find and hire AI-verified providers near you.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/app/requests')}>
            <SlidersHorizontal size={14} /> See open requests
          </Button>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input
                label="Search"
                className="pl-9"
                placeholder="Try 'React bug fix' or 'IELTS tutor'"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Category"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value, subcategory: '' })}
                options={[{ value: '', label: 'Any' }, ...taxonomy.map((t) => ({ value: t.category, label: t.category }))]}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Subcategory"
                value={filters.subcategory}
                onChange={(e) => setFilters({ ...filters, subcategory: e.target.value })}
                options={[{ value: '', label: 'Any' }, ...subcats.map((s) => ({ value: s, label: s }))]}
                disabled={!filters.category}
              />
            </div>
            <div className="md:col-span-2 relative">
              <MapPin size={14} className="absolute left-3 top-[38px]" style={{ color: 'var(--text-dim)' }} />
              <Input
                label="City"
                className="pl-9"
                placeholder="Anywhere"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Availability"
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                options={[
                  { value: '', label: 'Any' },
                  { value: 'available_now', label: 'Available now' },
                  { value: 'busy', label: 'Busy' },
                  { value: 'offline', label: 'Offline' },
                ]}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Min $/hr"
                type="number"
                value={filters.minRate}
                onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Max $/hr"
                type="number"
                value={filters.maxRate}
                onChange={(e) => setFilters({ ...filters, maxRate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Sort"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                options={[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'rating', label: 'Highest rated' },
                  { value: 'rate_asc', label: 'Price: low to high' },
                  { value: 'rate_desc', label: 'Price: high to low' },
                ]}
              />
            </div>
            <div className="md:col-span-6 flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({
                  q: '', category: '', subcategory: '', minRate: '', maxRate: '', availability: '', city: '', sort: 'relevance',
                })}
              >
                Clear filters
              </Button>
              <div className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                <Zap size={12} className="inline text-yellow-400" /> {entries.length} providers found
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No providers match your filters. Try clearing them.
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <ProviderCard
                key={e.id}
                entry={e}
                onHire={(entry) => {
                  setHireModal(entry);
                  setHireForm({
                    title: `Looking for help with ${entry.subcategory}`,
                    description: '',
                    urgency: 'within today',
                    budget: '',
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>

      <Modal open={!!hireModal} onClose={() => setHireModal(null)} title={`Hire ${hireModal?.provider?.name || 'provider'}`}>
        <div className="space-y-3">
          <Input label="Title" value={hireForm.title} onChange={(e) => setHireForm({ ...hireForm, title: e.target.value })} required />
          <Input
            label="Describe the task"
            as="textarea"
            rows={4}
            value={hireForm.description}
            onChange={(e) => setHireForm({ ...hireForm, description: e.target.value })}
            placeholder="Explain what you need, context, deliverables…"
          />
          <div className="grid md:grid-cols-2 gap-3">
            <Select
              label="Urgency"
              value={hireForm.urgency}
              onChange={(e) => setHireForm({ ...hireForm, urgency: e.target.value })}
              options={['immediate', 'within today', 'within 3 days']}
            />
            <Input
              label="Budget ($) — optional"
              type="number"
              value={hireForm.budget}
              onChange={(e) => setHireForm({ ...hireForm, budget: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setHireModal(null)}>Cancel</Button>
            <Button onClick={submitHire}>Post request</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}