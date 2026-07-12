import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { companySettings } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { toast.error('Please agree to the User Agreement & Privacy Policy'); return; }
    if (!username.trim() || !password) { toast.error('Please enter username and password'); return; }
    setLoading(true);
    const email = username.includes('@') ? username : `${username}@miaoda.com`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Login successful');
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          {companySettings?.logo_url ? (
            <img src={companySettings.logo_url} alt="logo" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 size={28} />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{companySettings?.company_name || 'ERP System'}</h1>
            {companySettings?.tagline && <p className="text-sm text-muted-foreground">{companySettings.tagline}</p>}
          </div>
        </div>

        <div className="rounded border border-border bg-card p-6 shadow-card">
          <h2 className="mb-5 text-base font-semibold text-foreground">Sign in to your account</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-normal text-foreground">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username or email"
                className="w-full rounded border border-input bg-input px-3 py-2 text-base !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-normal text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded border border-input bg-input px-3 py-2 pr-10 text-base !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input"
              />
              <label htmlFor="agree" className="cursor-pointer text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <span className="text-primary underline">User Agreement</span>
                {' '}and{' '}
                <span className="text-primary underline">Privacy Policy</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/reset-password" className="text-sm text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

