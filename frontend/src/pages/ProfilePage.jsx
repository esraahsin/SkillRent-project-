import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Avatar from '../components/ui/Avatar';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../lib/utils';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [taxonomy, setTaxonomy] = useState([]);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [mySkills, setMySkills] = useState([]);
  const [newSkill, setNewSkill] = useState({
    category: 'Tech & Development',
    subcategory: 'Web Development',
    description: '',
    hourlyRate: 25,
    responseTime: 'within 15 min',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/taxonomy').then((d) => setTaxonomy(d.taxonomy)).catch(() => {});
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      // FIX: was '/skills/mine', server route is '/skills/me'
      const { skills } = await api('/skills/me');
      setMySkills(skills);
    } catch {
      /* ignore */
    }
  }

  async function saveProfile() {
    setLoading(true);
    try {
      await api('/users/me', { method: 'PATCH', body: profile });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addSkill() {
    try {
      if (!newSkill.description.trim()) return toast.error('Add a description');
      await api('/skills', { method: 'POST', body: newSkill });
      setNewSkill({ ...newSkill, description: '' });
      loadSkills();
      toast.success('Skill added');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function deleteSkill(id) {
    try {
      await api(`/skills/${id}`, { method: 'DELETE' });
      loadSkills();
      toast.info('Skill removed');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const subcats = taxonomy.find((t) => t.category === newSkill.category)?.subcategories || [];
  const isProvider = user?.role === 'provider' || user?.role === 'both';

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-8">
        <h1 className="font-display text-3xl font-bold mb-6">Profile settings</h1>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={profile.name} src={profile.avatarUrl} size={72} />
            <div>
              <div className="font-semibold">{profile.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{user?.email}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="City" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            <Input
              label="Avatar URL"
              value={profile.avatarUrl}
              onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
              placeholder="https://…"
              className="md:col-span-2"
            />
            <Input
              label="Bio"
              as="textarea"
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="md:col-span-2"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveProfile} loading={loading}>
              <Save size={14} /> Save changes
            </Button>
          </div>
        </Card>

        {isProvider ? (
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4">My skills</h2>
            <div className="space-y-3 mb-6">
              {mySkills.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No skills yet.</p>
              ) : (
                mySkills.map((s) => (
                  <div key={s.id} className="sr-card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold">{s.subcategory} <span className="text-xs opacity-70">· {s.category}</span></div>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                        {formatCurrency(s.hourlyRate)}/hr · {s.responseTime}
                      </div>
                    </div>
                    <button onClick={() => deleteSkill(s.id)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="sr-divider my-4" />

            <h3 className="font-semibold mb-3">Add new skill</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Select
                label="Category"
                value={newSkill.category}
                onChange={(e) => {
                  const first = taxonomy.find((t) => t.category === e.target.value)?.subcategories[0] || '';
                  setNewSkill({ ...newSkill, category: e.target.value, subcategory: first });
                }}
                options={taxonomy.map((t) => t.category)}
              />
              <Select
                label="Subcategory"
                value={newSkill.subcategory}
                onChange={(e) => setNewSkill({ ...newSkill, subcategory: e.target.value })}
                options={subcats}
              />
              <Input
                label="Hourly rate ($)"
                type="number"
                value={newSkill.hourlyRate}
                onChange={(e) => setNewSkill({ ...newSkill, hourlyRate: Number(e.target.value) })}
              />
              <Select
                label="Response time"
                value={newSkill.responseTime}
                onChange={(e) => setNewSkill({ ...newSkill, responseTime: e.target.value })}
                options={['within 5 min', 'within 15 min', 'within 1 hour', 'within 1 day']}
              />
              <Input
                label="Description"
                as="textarea"
                rows={2}
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                className="md:col-span-2"
                placeholder="What do you offer, how do you deliver it?"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={addSkill}><Plus size={14} /> Add skill</Button>
            </div>
          </Card>
        ) : null}
      </section>
    </AppShell>
  );
}