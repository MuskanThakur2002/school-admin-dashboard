import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ShieldCheck, BarChart3, Users } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError((err as Error)?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex">
      {/* Left — gradient hero panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001854] via-[#002c98] to-[#1a43bf]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(61,95,201,0.4)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,105,112,0.2)_0%,_transparent_50%)]" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10">
              <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="font-display font-extrabold text-[1.25rem] text-white tracking-[-0.02em]">
              AdminDesk
            </span>
          </div>

          {/* Hero text */}
          <div className="max-w-lg">
            <h1 className="font-display text-[3.25rem] font-extrabold text-white leading-[1.08] tracking-[-0.03em] mb-5">
              School management,
              <br />
              <span className="text-secondary-fixed">reimagined.</span>
            </h1>
            <p className="text-[1.0625rem] text-white/60 leading-relaxed max-w-md">
              A premium platform for admissions, academics, fees, and communication.
              Built for schools that care about clarity.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex gap-3">
            {[
              { icon: ShieldCheck, label: 'Role-based access' },
              { icon: BarChart3, label: 'Real-time reports' },
              { icon: Users, label: 'Multi-tenant' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm ring-1 ring-white/[0.06]">
                <f.icon className="w-3.5 h-3.5 text-secondary-fixed" strokeWidth={2} />
                <span className="text-[0.75rem] font-medium text-white/70">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface relative">
        {/* Subtle accent blobs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,_rgba(0,44,152,0.03)_0%,_transparent_70%)]" />

        <div className="w-full max-w-[380px] relative z-10 animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-[14px] gradient-hero flex items-center justify-center shadow-[0_2px_8px_rgba(0,44,152,0.3)]">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-extrabold text-[1.25rem] text-on-surface tracking-[-0.02em]">
              AdminDesk
            </span>
          </div>

          <h2 className="font-display text-[1.75rem] font-bold text-on-surface tracking-tight mb-1.5">
            Welcome back
          </h2>
          <p className="text-body-md text-on-surface-variant/60 mb-8">
            Sign in to your admin account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="admin@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="flex items-center gap-2 text-body-sm text-tertiary bg-tertiary/[0.06] px-4 py-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
