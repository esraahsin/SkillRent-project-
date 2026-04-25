import Navbar from './Navbar';
import Footer from './Footer';

export default function AppShell({ children, showFooter = true }) {
  return (
    <div className="sr-bg min-h-screen">
      <Navbar />
      <main className="relative z-10">{children}</main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}
