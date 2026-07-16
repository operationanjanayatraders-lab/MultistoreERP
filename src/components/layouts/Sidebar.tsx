import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, ShoppingBag, ArrowLeftRight,
  AlertTriangle, RotateCcw, RotateCw, BookOpen, Settings, ChevronDown,
  ChevronRight, Menu, X, Building2, Users, Palette, ClipboardList,
  FileText, Receipt, BarChart2, BookMarked, ClipboardCheck,
  LogOut, UserCircle, Warehouse, Tags
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  isDivider?: boolean;
  permKey?: string;   // permission module key; undefined = always visible
  adminOnly?: boolean; // only visible to admins
}

const navItems: NavItem[] = [
  { label: 'Dashboard',      path: '/dashboard',     icon: <LayoutDashboard size={16} />, permKey: 'Dashboard' },
  {
    label: 'Item Master', icon: <Package size={16} />, permKey: 'Item Master',
    children: [
      { label: 'Items',       path: '/products',      icon: <Package size={14} /> },
      { label: 'Item Masters', path: '/item-masters', icon: <Tags size={14} /> },
    ]
  },
  { label: 'Inventory',      path: '/inventory',     icon: <Warehouse size={16} />,       permKey: 'Inventory' },
  { label: 'Branches',       path: '/branches',      icon: <Building2 size={16} />,       permKey: 'Inventory' },
  {
    label: 'Ledger Master', icon: <BookMarked size={16} />, permKey: 'Ledger Master',
    children: [
      { label: 'Suppliers', path: '/ledger/suppliers', icon: <UserCircle size={14} /> },
      { label: 'Customers', path: '/ledger/customers', icon: <UserCircle size={14} /> },
    ]
  },
  {
    label: 'Transactions', icon: <ClipboardList size={16} />,
    children: [
      { label: 'Sales',               path: '/sales',           icon: <ShoppingCart size={14} />,   permKey: 'Sales' },
      { label: 'Sales Return',        path: '/sales-return',    icon: <RotateCcw size={14} />,      permKey: 'Sales Return' },
      { label: 'Purchase',            path: '/purchase',        icon: <ShoppingBag size={14} />,    permKey: 'Purchase' },
      { label: 'Purchase Return',     path: '/purchase-return', icon: <RotateCw size={14} />,       permKey: 'Purchase Return' },
      { label: 'Damage & Defect',     path: '/damage-defect',   icon: <AlertTriangle size={14} />,  permKey: 'Damage & Defect' },
      { label: 'Physical Stock',      path: '/physical-stock',  icon: <ClipboardCheck size={14} />, permKey: 'Physical Stock' },
      { label: 'Inter Stock Transfer',path: '/stock-transfer',  icon: <ArrowLeftRight size={14} />, permKey: 'Stock Transfer' },
      { label: 'Purchase Order',      path: '/purchase-order',  icon: <ClipboardList size={14} />,  permKey: 'Purchase' },
      { label: 'Proforma Invoice',    path: '/proforma',        icon: <FileText size={14} />,       permKey: 'Proforma Invoice' },
      { label: 'Quotation',           path: '/quotation',       icon: <Receipt size={14} />,        permKey: 'Quotation' },
    ]
  },
  {
    label: 'Accounts', icon: <BookOpen size={16} />, permKey: 'Accounts',
    children: [
      { label: 'Chart of Accounts', path: '/accounts/chart',         icon: <BarChart2 size={14} /> },
      { label: 'Ledger',            path: '/accounts/ledger',        icon: <BookOpen size={14} /> },
      { label: 'Journal Entry',     path: '/accounts/journal',       icon: <BookOpen size={14} /> },
      { label: 'Payment Voucher',   path: '/accounts/payment',       icon: <BookOpen size={14} /> },
      { label: 'Receipt Voucher',   path: '/accounts/receipt',       icon: <BookOpen size={14} /> },
      { label: 'Contra Voucher',    path: '/accounts/contra',        icon: <BookOpen size={14} /> },
      { label: 'Debit Voucher',     path: '/accounts/debit-note',    icon: <BookOpen size={14} /> },
      { label: 'Credit Voucher',    path: '/accounts/credit-note',   icon: <BookOpen size={14} /> },
      { label: 'Balance Sheet',     path: '/accounts/balance-sheet', icon: <BookOpen size={14} /> },
      { label: 'Profit & Loss',     path: '/accounts/pnl',           icon: <BookOpen size={14} /> },
    ]
  },
  {
    label: 'User Settings', icon: <Users size={16} />, adminOnly: true,
    children: [
      { label: 'Create User', path: '/users/create', icon: <Users size={14} /> },
      { label: 'Modify User', path: '/users/manage', icon: <Users size={14} /> },
      { label: 'User Rights', path: '/users/rights', icon: <Users size={14} /> },
    ]
  },
  {
    label: 'Daily Tasks', icon: <ClipboardCheck size={16} />, permKey: 'Daily Tasks',
    children: [
      { label: 'Submit Report', path: '/daily-tasks/submit',  icon: <ClipboardList size={14} /> },
      { label: 'Reports',       path: '/daily-tasks/reports', icon: <FileText size={14} /> },
      { label: 'Masters',       path: '/daily-tasks/masters', icon: <Settings size={14} /> },
    ]
  },
  { label: 'App Settings', path: '/settings', icon: <Settings size={16} />, permKey: 'App Settings' },
  { label: 'Themes',       path: '/themes',   icon: <Palette size={16} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NavItemComponent: React.FC<{ item: NavItem; collapsed: boolean; onClose?: () => void }> = ({ item, collapsed, onClose }) => {
  const location = useLocation();
  const { hasPermission, isAdmin } = useAuth();

  // Permission check for this item
  const permitted = item.adminOnly
    ? isAdmin
    : item.permKey
    ? hasPermission(item.permKey)
    : true;

  const childIsActive = (children: NavItem[]) =>
    children.some(c => c.path && location.pathname === c.path.split('?')[0]);

  const [open, setOpen] = useState(() => item.children ? childIsActive(item.children) : false);

  useEffect(() => {
    if (item.children) setOpen(childIsActive(item.children));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!permitted) return null;

  if (item.children) {
    // Filter children by permission too
    const visibleChildren = item.children.filter(c =>
      c.adminOnly ? isAdmin : c.permKey ? hasPermission(c.permKey) : true
    );
    if (visibleChildren.length === 0) return null;

    const isActive = childIsActive(visibleChildren);
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          )}
        >
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-0.5 border-l border-sidebar-border pl-3 space-y-0.5">
            {visibleChildren.map((child, i) => (
              <NavItemComponent key={child.path || i} item={child} collapsed={false} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const basePath = item.path?.split('?')[0] || '';
  const isActive = basePath ? location.pathname === basePath || location.pathname.startsWith(basePath + '/') : false;
  return (
    <Link
      to={item.path!}
      onClick={onClose}
      className={cn(
        'flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, onMobileClose }) => {
  const { companySettings, signOut } = useAuth();

  const content = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo / Brand */}
      {collapsed ? (
        /* Collapsed: small centered icon */
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border shrink-0">
          {companySettings?.logo_url ? (
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full overflow-hidden">
              <img src={companySettings.logo_url} alt="logo" className="block w-full h-full object-cover object-center scale-110" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-primary/10">
              <Building2 size={16} className="text-sidebar-primary" />
            </div>
          )}
        </div>
      ) : (
        /* Expanded: double-ring circle logo centered, name + tagline below */
        <div className="flex flex-col items-center gap-3 border-b border-sidebar-border px-4 py-6 shrink-0">
          {/* Clean circle logo */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full overflow-hidden">
            {companySettings?.logo_url ? (
              <img src={companySettings.logo_url} alt="logo" className="block w-full h-full object-cover object-center scale-110" />
            ) : (
              <Building2 size={24} className="text-sidebar-primary" />
            )}
          </div>
          {/* Company name */}
          <p className="text-center text-sm font-semibold text-sidebar-foreground leading-tight truncate max-w-full px-1">
            {companySettings?.company_name || 'ERP System'}
          </p>
          {/* Tagline */}
          {companySettings?.tagline && (
            <p className="text-center text-[10px] text-sidebar-foreground/60 leading-tight truncate max-w-full px-1">
              {companySettings.tagline}
            </p>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-6 space-y-0.5">
        {navItems.map((item, i) => (
          <NavItemComponent key={i} item={item} collapsed={collapsed} onClose={onMobileClose} />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border px-2 py-2">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span className="truncate">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0 transition-all duration-150 h-full',
        collapsed ? 'w-14' : 'w-56'
      )}>
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-xl">
            {content}
          </aside>
          <button
            onClick={onMobileClose}
            className="absolute right-4 top-4 z-10 rounded bg-sidebar p-1 text-sidebar-foreground"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
};

export const SidebarToggle: React.FC<{ collapsed: boolean; onToggle: () => void; onMobileOpen: () => void }> = ({
  collapsed, onToggle, onMobileOpen
}) => (
  <>
    <button
      onClick={onToggle}
      className="hidden lg:inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <Menu size={18} />
    </button>
    <button
      onClick={onMobileOpen}
      className="inline-flex items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
    >
      <Menu size={18} />
    </button>
  </>
);
