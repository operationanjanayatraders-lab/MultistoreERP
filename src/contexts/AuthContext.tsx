import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/db/supabase';
import type {
  Profile,
  CompanySettings,
  Company,
  Branch,
  Warehouse
} from '@/types/types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;

  company: Company | null;
  branch: Branch | null;
  warehouse: Warehouse | null;

  companySettings: CompanySettings | null;

  loading: boolean;
  isAdmin: boolean;
  hasPermission: (module: string) => boolean;
  refreshProfile: () => Promise<void>;
  refreshCompanySettings: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile(data as Profile | null);
  };
const fetchOrganizationData = async (uid: string) => {
  const { data } = await supabase
    .from('profiles')
    .select(`
      *,
      companies (*),
      branches (*),
      warehouses (*)
    `)
    .eq('id', uid)
    .single();

  if (!data) return;

  setCompany(data.companies || null);
  setBranch(data.branches || null);
  setWarehouse(data.warehouses || null);
};
  const fetchCompanySettings = async () => {
    const { data } = await supabase.from('company_settings').select('*').order('created_at').limit(1).maybeSingle();
    setCompanySettings(data as CompanySettings | null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshCompanySettings = async () => {
    await fetchCompanySettings();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
  Promise.all([
    fetchProfile(session.user.id),
    fetchOrganizationData(session.user.id),
    fetchCompanySettings()
  ]).finally(() => setLoading(false));
} else {
  fetchCompanySettings().finally(() => setLoading(false));
}
  });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
if (session?.user) {
  fetchProfile(session.user.id);
  fetchOrganizationData(session.user.id);
  fetchCompanySettings();
} else {
  setProfile(null);
}
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';

  // Admins have access to everything; regular users check their permissions object.
  // If permissions key is absent/undefined for a module, default to true (access granted).
  const hasPermission = (module: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    const perms = profile.permissions as Record<string, boolean> | undefined;
    if (!perms) return true; // no restrictions set yet → full access
    return perms[module] !== false; // explicit false = blocked; true/missing = allowed
  };
  console.log('Profile:', profile);
  console.log('Company:', company);
  console.log('Branch:', branch);
  console.log('Warehouse:', warehouse);
  return (
   <AuthContext.Provider value={{
  session,
  user,
  profile,

  company,
  branch,
  warehouse,

  companySettings,
  loading,
  isAdmin,
  hasPermission,
  refreshProfile,
  refreshCompanySettings,
  signOut
}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
