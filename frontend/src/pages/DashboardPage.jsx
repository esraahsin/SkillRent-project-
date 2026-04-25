import { useEffect, useState } from 'react';
import { DollarSign, Star, CheckCircle2, Clock, TrendingUp, Zap, Wallet, Users } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import TrustGauge from '../components/ui/TrustGauge';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatRelative } from '../lib/utils';

function StatCard({ icon: Icon, label, value, accent = 'indigo' }) {
  const accents = {
    indigo: 'from-indigo-500/20 to-indigo-500/0 text-indigo-300',
    pink: 'from-pink-500/20 to-pink-500/0 text-pink-300',
    cyan: 'from-cyan-500/20 to-cyan-500/0 text-cyan-300',
    emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300',
  };
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${accents[accent]} opacity-60 pointer-events-none`} />
      <div className="relative">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-white/5 ${accents[accent].split(' ').pop()}`}>
          <Icon size={18} />
        </div>
        <div className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</div>
        <div className="font-display text-2xl font-bold mt-1">{value}</div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [provider, setProvider] = useState(null);
  const [seeker, setSeeker] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api('/dashboard/provider'),
        api('/dashboard/seeker'),
        api('/favorites'),
      ]);
      if (results[0].status === 'fulfilled') setProvider(results[0].value);
      if (results[1].status === 'fulfilled') setSeeker(results[1].value);
      if (results[2].status === 'fulfilled') setFavorites(results[2].value.favorites);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setAvailability(status) {
    try {
      await api('/users/me/availability', { method: 'POST', body: { availabilityStatus: status } });
      await refreshUser();
      toast.success(`You are now ${status.replace('_', ' ')}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const isProvider = user?.mode === 'provider' || user?.mode === 'both';
  const isSeeker = user?.mode === 'seeker' || user?.mode === 'both';

  return (
    <AppShell>
      <section className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Hey, {user?.name?.split(' ')[0]} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Here is what’s happening on your account.</p>
          </div>
          {isProvider ? (
            <div className="flex gap-2">
              <Button size="sm" variant={user?.availabilityStatus === 'available_now' ? 'primary' : 'secondary'} onClick={() => setAvailability('available_now')}>
                <Zap size={14} /> Available
              </Button>
              <Button size="sm" variant={user?.availabilityStatus === 'busy' ? 'primary' : 'secondary'} onClick={() => setAvailability('busy')}>Busy</Button>
              <Button size="sm" variant={user?.availabilityStatus === 'offline' ? 'primary' : 'secondary'} onClick={() => setAvailability('offline')}>Offline</Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            {isProvider && provider ? (
              <>
                <h2 className="font-display text-lg font-semibold mb-3">Provider stats</h2>
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                  <StatCard icon={DollarSign} label="Total earnings" value={formatCurrency(provider.totalEarnings)} accent="emerald" />
                  <StatCard icon={CheckCircle2} label="Sessions completed" value={provider.sessionsCompleted} accent="indigo" />
                  <StatCard icon={Star} label="Average rating" value={provider.averageRating?.toFixed(2) || '—'} accent="pink" />
                  <StatCard icon={Clock} label="Pending requests" value={provider.pendingRequests} accent="cyan" />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_320px] mb-8">
                  <Card className="p-5">
                    <h3 className="font-semibold mb-3">Recent reviews</h3>
                    {provider.recentReviews?.length ? (
                      <div className="space-y-3">
                        {provider.recentReviews.map((r) => (
                          <div key={r.id} className="sr-card p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex text-yellow-400">
                                {[...Array(r.rating)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{formatRelative(r.createdAt)}</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{r.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>}
                  </Card>

                  <Card className="p-5 flex flex-col items-center justify-center">
                    <h3 className="font-semibold mb-3">Trust score</h3>
                    {provider.trustScore ? (
                      <TrustGauge value={provider.trustScore.value} band={provider.trustScore.band} size={140} />
                    ) : null}
                    <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                      <TrendingUp size={12} className="inline text-emerald-400" /> Complete sessions to raise your score.
                    </p>
                  </Card>
                </div>
              </>
            ) : null}

            {isSeeker && seeker ? (
              <>
                <h2 className="font-display text-lg font-semibold mb-3">Seeker stats</h2>
                <div className="grid gap-4 md:grid-cols-4 mb-8">
                  <StatCard icon={Zap} label="Active sessions" value={seeker.activeSessions?.length || 0} accent="indigo" />
                  <StatCard icon={CheckCircle2} label="Past sessions" value={seeker.pastSessions?.length || 0} accent="emerald" />
                  <StatCard icon={Wallet} label="Total spent" value={formatCurrency(seeker.spendingSummary)} accent="pink" />
                  <StatCard icon={Users} label="Favorites" value={favorites.length} accent="cyan" />
                </div>

                {favorites.length > 0 ? (
                  <Card className="p-5 mb-8">
                    <h3 className="font-semibold mb-3">Your favorite providers</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {favorites.map((p) => (
                        <a key={p.id} href={`/app/providers/${p.id}`} className="sr-card sr-card-hover p-3 flex items-center gap-3">
                          <Avatar name={p.name} src={p.avatarUrl} size={40} />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate">{p.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{p.city}</div>
                          </div>
                          <Badge tone={p.availabilityStatus === 'available_now' ? 'green' : 'slate'}>
                            {p.availabilityStatus?.replace('_', ' ')}
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </Card>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}
