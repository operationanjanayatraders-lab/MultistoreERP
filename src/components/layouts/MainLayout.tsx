import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PermissionGuard } from './PermissionGuard';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Header
          sidebarCollapsed={collapsed}
          onSidebarToggle={() => setCollapsed(v => !v)}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <PermissionGuard>{children}</PermissionGuard>
        </main>
      </div>
    </div>
  );
};
