import { AlertTriangle, Clock, Users } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import { formatCurrency, formatRelative } from '../../lib/utils';

export default function RequestCard({ request, onApply, onAccept, canApply, canAccept, isOwn }) {
  const urgencyTone =
    request.urgency === 'immediate' ? 'red' : request.urgency === 'within today' ? 'orange' : 'yellow';

  return (
    <Card hover className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={request.seeker?.name} src={request.seeker?.avatarUrl} size={40} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{request.title}</h3>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {request.seeker?.name} · {request.seeker?.city || '—'} · {formatRelative(request.createdAt)}
          </div>
        </div>
        <Badge tone={urgencyTone}>
          <AlertTriangle size={10} /> {request.urgency}
        </Badge>
      </div>

      <p className="text-sm line-clamp-3" style={{ color: 'var(--text-muted)' }}>
        {request.description}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{request.category}</Badge>
        <Badge>{request.subcategory}</Badge>
        {request.budget ? (
          <Badge tone="green">Budget {formatCurrency(request.budget)}</Badge>
        ) : null}
        <Badge>Status: {request.status}</Badge>
      </div>

      <div className="flex items-center justify-between pt-2 mt-auto border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><Users size={12} /> {request.applicants?.length || 0} applicants</span>
        <div className="flex gap-2">
          {canApply ? <Button size="sm" variant="secondary" onClick={() => onApply?.(request)}>Apply</Button> : null}
          {canAccept ? <Button size="sm" onClick={() => onAccept?.(request)}>Accept</Button> : null}
          {isOwn ? <span className="sr-pill sr-pill-brand">Your request</span> : null}
        </div>
      </div>
    </Card>
  );
}
