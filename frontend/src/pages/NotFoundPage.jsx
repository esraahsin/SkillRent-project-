import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <AppShell showFooter={false}>
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="font-display text-8xl font-black sr-gradient-text">404</div>
        <h1 className="mt-3 font-display text-2xl font-bold">Page not found</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          The link you followed may be broken or the page was moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/"><Button variant="secondary"><Home size={14} /> Home</Button></Link>
          <Link to="/app/marketplace"><Button><Compass size={14} /> Marketplace</Button></Link>
        </div>
      </div>
    </AppShell>
  );
}
