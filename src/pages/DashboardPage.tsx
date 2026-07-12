import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, FileText, Receipt, CreditCard, Clock, ArrowUpRight } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { getDashboardStats, getTopSellingItems, getLowStockItems } from '@/lib/api';

interface Stats {
  totalSales: number;
  totalPurchase: number;
  totalProducts: number;
  totalOrders: number;
  totalStock: number;
  totalProforma: number;
  totalChallan: number;
  paymentReceived: number;
  paymentDue: number;
}

interface TopItem { id: string; name: string; sku: string; cat: string; qty: number; }

// Mini sparkline — simple SVG bars
const Sparkline: React.FC<{ color: string }> = ({ color }) => {
  const bars = [3, 7, 5, 9, 6, 8, 4, 10, 7, 9];
  const max = Math.max(...bars);
  return (
    <svg viewBox="0 0 40 16" className="h-6 w-10 opacity-70" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={i * 4 + 0.5} y={16 - (b / max) * 14} width={3} height={(b / max) * 14} rx={1} fill={color} />
      ))}
    </svg>
  );
};

const TILES: Array<{
  key: keyof Stats;
  label: string;
  icon: React.ReactNode;
  color: string;
  sparkColor: string;
  isCurrency: boolean;
}> = [
  { key: 'totalSales',       label: 'Total Sales',         icon: <TrendingUp size={16} />,   color: 'bg-chart-1',  sparkColor: '#22c55e', isCurrency: true },
  { key: 'totalPurchase',    label: 'Total Purchase',      icon: <TrendingDown size={16} />, color: 'bg-chart-2',  sparkColor: '#f97316', isCurrency: true },
  { key: 'paymentReceived',  label: 'Payment Received',    icon: <CreditCard size={16} />,   color: 'bg-chart-3',  sparkColor: '#06b6d4', isCurrency: true },
  { key: 'paymentDue',       label: 'Payment Due',         icon: <Clock size={16} />,        color: 'bg-chart-4',  sparkColor: '#ef4444', isCurrency: true },
  { key: 'totalOrders',      label: 'Total Sales Invoice', icon: <ShoppingCart size={16} />, color: 'bg-primary',  sparkColor: '#a78bfa', isCurrency: false },
  { key: 'totalProforma',    label: 'Total Proforma',      icon: <FileText size={16} />,     color: 'bg-chart-5',  sparkColor: '#fbbf24', isCurrency: true },
  { key: 'totalChallan',     label: 'Total Challan',       icon: <Receipt size={16} />,      color: 'bg-sidebar-primary', sparkColor: '#34d399', isCurrency: true },
];

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [lowItems, setLowItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), getTopSellingItems(8), getLowStockItems(8)]).then(([s, top, low]) => {
      setStats(s as Stats);
      setTopItems(top as TopItem[]);
      setLowItems(low as TopItem[]);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <MainLayout>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {[...Array(7)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded bg-muted" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground text-balance">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Business overview — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* 7 KPI Tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {TILES.map(tile => {
            const val = stats?.[tile.key] ?? 0;
            return (
              <div key={tile.key} className="flex flex-col rounded border border-border bg-card p-3 shadow-card h-full">
                <div className="flex items-center justify-between mb-1">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-white ${tile.color}`}>
                    {tile.icon}
                  </div>
                  <Sparkline color={tile.sparkColor} />
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground leading-tight mt-1">
                  {tile.isCurrency ? fmt(Number(val)) : String(val)}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 text-pretty">{tile.label}</p>
              </div>
            );
          })}
        </div>

        {/* Highest Selling & Low Stocks */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Highest Selling */}
          <div className="rounded border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Highest Selling Items</h3>
              <a href="/products" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-muted-foreground">CAT ID</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item Name</th>
                    <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">No sales data yet</td></tr>
                  ) : topItems.map(item => (
                    <tr key={item.id} className="border-b border-border erp-table-row">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-primary">{item.sku}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-foreground">{item.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-chart-1">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stocks */}
          <div className="rounded border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Low Stocks</h3>
              <a href="/inventory" className="flex items-center gap-1 text-xs text-primary hover:underline">
                View all <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-muted-foreground">CAT ID</th>
                    <th className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item Name</th>
                    <th className="whitespace-nowrap px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lowItems.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">All items well-stocked</td></tr>
                  ) : lowItems.map(item => (
                    <tr key={item.id} className="border-b border-border erp-table-row">
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-primary">{item.sku}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-foreground">{item.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs tabular-nums font-semibold text-destructive">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

