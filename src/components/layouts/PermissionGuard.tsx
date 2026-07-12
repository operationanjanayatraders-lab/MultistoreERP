import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Maps route path prefixes → permission module key
const ROUTE_PERMISSION_MAP: { prefix: string; module: string }[] = [
  { prefix: '/dashboard',       module: 'Dashboard' },
  { prefix: '/products',        module: 'Item Master' },
  { prefix: '/inventory',       module: 'Inventory' },
  { prefix: '/ledger',          module: 'Ledger Master' },
  { prefix: '/sales-return',    module: 'Sales Return' },
  { prefix: '/sales',           module: 'Sales' },
  { prefix: '/purchase-return', module: 'Purchase Return' },
  { prefix: '/purchase-order',  module: 'Purchase' },
  { prefix: '/purchase',        module: 'Purchase' },
  { prefix: '/damage-defect',   module: 'Damage & Defect' },
  { prefix: '/physical-stock',  module: 'Physical Stock' },
  { prefix: '/stock-transfer',  module: 'Stock Transfer' },
  { prefix: '/proforma',        module: 'Proforma Invoice' },
  { prefix: '/quotation',       module: 'Quotation' },
  { prefix: '/accounts',        module: 'Accounts' },
  { prefix: '/settings',        module: 'App Settings' },
  { prefix: '/daily-tasks',     module: 'Daily Tasks' },
  { prefix: '/users',           module: '__admin__' }, // admin only
  { prefix: '/themes',          module: '' },          // always allowed
  { prefix: '/profile',         module: '' },
  { prefix: '/change-password', module: '' },
];

export const PermissionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { hasPermission, isAdmin, profile } = useAuth();

  // Find the best-matching rule (longest prefix match)
  const rule = ROUTE_PERMISSION_MAP
    .filter(r => pathname.startsWith(r.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!rule) return <>{children}</>;

  // Empty module = always accessible
  if (rule.module === '') return <>{children}</>;

  // Admin-only routes
  if (rule.module === '__admin__') {
    if (isAdmin) return <>{children}</>;
    return <AccessDenied />;
  }

  // Regular permission check
  if (!profile || !hasPermission(rule.module)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

const AccessDenied: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
      <ShieldOff size={32} className="text-destructive" />
    </div>
    <div>
      <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">
        You don't have permission to view this page. Please contact your administrator.
      </p>
    </div>
  </div>
);
