import { Github, Twitter, Linkedin, Heart } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Your skills have value. Rent them now. Instant, local, verified micro-skill exchange powered by AI.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Product</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#how" className="hover:text-white">How it works</a></li>
            <li><a href="#categories" className="hover:text-white">Categories</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Company</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><a href="#" className="hover:text-white">About</a></li>
            <li><a href="#" className="hover:text-white">Privacy</a></li>
            <li><a href="#" className="hover:text-white">Terms</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Connect</h4>
          <div className="flex gap-3">
            <a className="sr-btn sr-btn-ghost !p-2" href="#" aria-label="GitHub"><Github size={16} /></a>
            <a className="sr-btn sr-btn-ghost !p-2" href="#" aria-label="Twitter"><Twitter size={16} /></a>
            <a className="sr-btn sr-btn-ghost !p-2" href="#" aria-label="LinkedIn"><Linkedin size={16} /></a>
          </div>
        </div>
      </div>

      <div className="border-t py-5 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
        © {new Date().getFullYear()} SkillRent. Built with <Heart size={12} className="inline text-pink-400" /> for the hackathon.
      </div>
    </footer>
  );
}
