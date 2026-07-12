import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const ResetPasswordPage: React.FC = () => {
  const { companySettings } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { toast.error('Please enter your username or email'); return; }
    setLoading(true);
    const email = username.includes('@') ? username : `${username}@miaoda.com`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error('Could not send reset email. Please contact admin.'); return; }
    setSent(true);
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
          <h1 className="text-xl font-bold">{companySettings?.company_name || 'ERP System'}</h1>
        </div>

        <div className="rounded border border-border bg-card p-6 shadow-card">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                If this account exists, password reset instructions have been sent. Please contact your administrator if you continue to have issues.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-base font-semibold">Reset Password</h2>
              <p className="mb-5 text-sm text-muted-foreground">Enter your username to receive reset instructions.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-normal">Username or Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full rounded border border-input bg-input px-3 py-2 text-base !text-gray-900 placeholder:text-gray-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send Reset Instructions'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

