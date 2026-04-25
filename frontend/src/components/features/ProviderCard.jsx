import { useNavigate } from 'react-router-dom';
import { Star, Clock, MapPin, Sparkles, CheckCircle2, Zap } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { formatCurrency, trustBandColor } from '../../lib/utils';

export default function ProviderCard({ entry, onHire }) {
  const navigate = useNavigate();
  const provider = entry.provider;
  const availability = entry.availabilityStatus;
  const availabilityTone =
    availability === 'available_now' ? 'green' : availability === 'busy' ? 'orange' : 'slate';

  return (
    <Card hover className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={provider?.name} src={provider?.avatarUrl} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold truncate">{provider?.name}</h3>
            {entry.isVerified ? (
              <CheckCircle2 size={14} className="text-cyan-400" title="AI Verified" />
            ) : null}
          </div>
          <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <MapPin size={12} /> <span>{provider?.city || '—'}</span>
          </div>
        </div>
        {provider?.trustScore ? (
          <span className={`sr-pill ${trustBandColor(provider.trustScore.band)}`}>
            <Sparkles size={10} /> Trust {provider.trustScore.value}
          </span>
        ) : null}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge tone="brand">{entry.subcategory}</Badge>
          <Badge tone={availabilityTone}>
            {availability === 'available_now' ? <Zap size={10} /> : null}
            {availability?.replace('_', ' ')}
          </Badge>
        </div>
        <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {entry.description}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {entry.responseTime}
        </span>
        <span className="flex items-center gap-1">
          <Star size={12} className="text-yellow-400" />
          {entry.avgRating ? entry.avgRating.toFixed(1) : 'New'} · {entry.completedSessions || 0} sessions
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 mt-auto border-t" style={{ borderColor: 'var(--border)' }}>
        <div>
          <span className="font-display text-xl font-bold sr-gradient-text">
            {formatCurrency(entry.hourlyRate)}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>/hour</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate(`/app/providers/${provider?.id}`)}>
            View
          </Button>
          <Button size="sm" onClick={() => onHire?.(entry)}>
            Hire
          </Button>
        </div>
      </div>
    </Card>
  );
}
