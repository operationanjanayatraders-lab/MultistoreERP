import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { MainLayout } from '@/components/layouts/MainLayout';

interface AppTheme {
  id: string;
  name: string;
  description: string;
  vars: Record<string, string>;
  previewBg: string;
  previewSidebar: string;
  previewAccent: string;
}
const THEMES: AppTheme[] = [
  {
    id: 'neo',
    name: 'Neo (Default)',
    description: 'Deep navy professional theme with cyan accent',
    previewBg: '#0B1325',
    previewSidebar: '#0f1e38',
    previewAccent: '#00E5FF',
    vars: {
      '--background': '213 50% 8%',
      '--foreground': '210 40% 96%',
      '--card': '215 45% 10%',
      '--card-foreground': '210 40% 96%',
      '--primary': '185 100% 50%',
      '--primary-foreground': '213 50% 8%',
      '--sidebar': '215 48% 10%',
      '--sidebar-foreground': '210 30% 85%',
      '--sidebar-primary': '185 100% 50%',
      '--sidebar-primary-foreground': '213 50% 8%',
      '--sidebar-accent': '215 35% 18%',
      '--sidebar-accent-foreground': '210 40% 96%',
      '--border': '215 35% 18%',
      '--input': '215 40% 14%',
      '--ring': '185 100% 50%',
    },
  },

  {
    id: 'neo-purple',
    name: 'Neo Purple Pro',
    description: 'Premium purple professional theme',
    previewBg: '#1e1b4b',
    previewSidebar: '#312e81',
    previewAccent: '#8b5cf6',
    vars: {
      '--background': '240 30% 8%',
      '--foreground': '240 20% 96%',
      '--card': '240 25% 12%',
      '--card-foreground': '240 20% 96%',
      '--primary': '262 83% 58%',
      '--primary-foreground': '240 20% 96%',
      '--sidebar': '240 40% 12%',
      '--sidebar-foreground': '240 20% 90%',
      '--sidebar-primary': '262 83% 58%',
      '--sidebar-primary-foreground': '240 20% 96%',
      '--sidebar-accent': '240 35% 18%',
      '--sidebar-accent-foreground': '240 20% 96%',
      '--border': '240 20% 20%',
      '--input': '240 20% 16%',
      '--ring': '262 83% 58%',
    },
  },

  {
    id: 'neo-emerald',
    name: 'Neo Emerald',
    description: 'Modern emerald business theme',
    previewBg: '#052e16',
    previewSidebar: '#14532d',
    previewAccent: '#10b981',
    vars: {
      '--background': '145 60% 8%',
      '--foreground': '0 0% 100%',
      '--card': '145 50% 12%',
      '--card-foreground': '0 0% 100%',
      '--primary': '160 84% 50%',
      '--primary-foreground': '0 0% 100%',
      '--sidebar': '145 55% 15%',
      '--sidebar-foreground': '0 0% 100%',
      '--sidebar-primary': '160 84% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '145 35% 22%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--border': '145 30% 18%',
      '--input': '145 35% 14%',
      '--ring': '160 84% 50%',
    },
  },

  {
    id: 'neo-midnight',
    name: 'Neo Midnight',
    description: 'Ultra dark executive dashboard theme',
    previewBg: '#020617',
    previewSidebar: '#0f172a',
    previewAccent: '#22d3ee',
    vars: {
      '--background': '222 84% 4%',
      '--foreground': '210 40% 98%',
      '--card': '222 65% 8%',
      '--card-foreground': '210 40% 98%',
      '--primary': '188 94% 43%',
      '--primary-foreground': '222 84% 4%',
      '--sidebar': '222 75% 8%',
      '--sidebar-foreground': '210 40% 92%',
      '--sidebar-primary': '188 94% 43%',
      '--sidebar-primary-foreground': '222 84% 4%',
      '--sidebar-accent': '222 45% 16%',
      '--sidebar-accent-foreground': '210 40% 98%',
      '--border': '222 45% 14%',
      '--input': '222 50% 11%',
      '--ring': '188 94% 43%',
    },
  },

  {
    id: 'neo-crimson',
    name: 'Neo Crimson',
    description: 'Bold red trading and sales theme',
    previewBg: '#450a0a',
    previewSidebar: '#7f1d1d',
    previewAccent: '#ef4444',
    vars: {
      '--background': '0 55% 8%',
      '--foreground': '0 15% 96%',
      '--card': '0 40% 12%',
      '--card-foreground': '0 15% 96%',
      '--primary': '0 84% 60%',
      '--primary-foreground': '0 15% 96%',
      '--sidebar': '0 60% 12%',
      '--sidebar-foreground': '0 15% 92%',
      '--sidebar-primary': '0 84% 60%',
      '--sidebar-primary-foreground': '0 15% 96%',
      '--sidebar-accent': '0 40% 18%',
      '--sidebar-accent-foreground': '0 15% 96%',
      '--border': '0 35% 18%',
      '--input': '0 40% 14%',
      '--ring': '0 84% 60%',
    },
  },

  {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Bright ocean blues for a fresh, modern feel',
    previewBg: '#f0f7ff',
    previewSidebar: '#1a4a8a',
    previewAccent: '#2563eb',
    vars: {
      '--background': '210 100% 97%',
      '--foreground': '215 50% 15%',
      '--card': '0 0% 100%',
      '--card-foreground': '215 50% 15%',
      '--primary': '220 90% 55%',
      '--primary-foreground': '0 0% 100%',
      '--sidebar': '220 65% 30%',
      '--sidebar-foreground': '210 60% 92%',
      '--sidebar-primary': '210 100% 70%',
      '--sidebar-primary-foreground': '220 65% 15%',
      '--sidebar-accent': '220 55% 40%',
      '--sidebar-accent-foreground': '0 0% 100%',
      '--border': '214 20% 86%',
      '--input': '213 18% 92%',
      '--ring': '220 90% 55%',
    },
  },

  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Earthy greens for a calm, focused workspace',
    previewBg: '#f2f7f4',
    previewSidebar: '#1a4a2a',
    previewAccent: '#16a34a',
    vars: {
      '--background': '145 30% 96%',
      '--foreground': '145 40% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '145 40% 12%',
      '--primary': '145 65% 40%',
      '--primary-foreground': '0 0% 100%',
      '--sidebar': '145 55% 18%',
      '--sidebar-foreground': '145 30% 90%',
      '--sidebar-primary': '145 60% 55%',
      '--sidebar-primary-foreground': '145 55% 10%',
      '--sidebar-accent': '145 45% 26%',
      '--sidebar-accent-foreground': '0 0% 98%',
      '--border': '145 20% 88%',
      '--input': '145 18% 93%',
      '--ring': '145 65% 40%',
    },
  },

  {
    id: 'amber',
    name: 'Warm Amber',
    description: 'Warm amber tones for an inviting, energetic environment',
    previewBg: '#fffbf0',
    previewSidebar: '#4a2a00',
    previewAccent: '#d97706',
    vars: {
      '--background': '45 100% 97%',
      '--foreground': '25 50% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '25 50% 12%',
      '--primary': '38 95% 48%',
      '--primary-foreground': '0 0% 100%',
      '--sidebar': '30 75% 18%',
      '--sidebar-foreground': '40 60% 92%',
      '--sidebar-primary': '38 90% 60%',
      '--sidebar-primary-foreground': '30 75% 10%',
      '--sidebar-accent': '30 60% 28%',
      '--sidebar-accent-foreground': '0 0% 98%',
      '--border': '35 25% 88%',
      '--input': '35 20% 93%',
      '--ring': '38 95% 48%',
    },
  },

{
  id: 'royal-gold',
  name: 'Royal Gold',
  description: 'Rich navy and gold palette for a premium executive experience',
  previewBg: '#0f121f',
  previewSidebar: '#2d230c',
  previewAccent: '#fbbf24',
  vars: {
    '--background': '220 30% 8%',
    '--foreground': '45 15% 95%',
    '--card': '220 35% 12%',
    '--card-foreground': '45 15% 95%',
    '--primary': '43 100% 60%',
    '--primary-foreground': '220 30% 10%',
    '--sidebar': '220 40% 14%',
    '--sidebar-foreground': '45 20% 88%',
    '--sidebar-primary': '43 100% 60%',
    '--sidebar-primary-foreground': '220 30% 10%',
    '--sidebar-accent': '45 100% 30%',
    '--sidebar-accent-foreground': '220 30% 10%',
    '--border': '220 25% 18%',
    '--input': '220 25% 15%',
    '--ring': '43 100% 60%',
  },
},
{
  id: 'cyber-neon',
  name: 'Cyber Neon',
  description: 'Dark futuristic theme with glowing cyan and violet highlights',
  previewBg: '#05060f',
  previewSidebar: '#180b35',
  previewAccent: '#00ffe7',
  vars: {
    '--background': '230 60% 6%',
    '--foreground': '185 100% 96%',
    '--card': '230 45% 12%',
    '--card-foreground': '185 100% 96%',
    '--primary': '180 100% 62%',
    '--primary-foreground': '230 60% 6%',
    '--sidebar': '255 60% 12%',
    '--sidebar-foreground': '215 40% 90%',
    '--sidebar-primary': '180 100% 62%',
    '--sidebar-primary-foreground': '230 60% 6%',
    '--sidebar-accent': '192 100% 35%',
    '--sidebar-accent-foreground': '230 60% 6%',
    '--border': '230 35% 18%',
    '--input': '230 35% 14%',
    '--ring': '180 100% 62%',
  },
},
{
  id: 'sapphire-luxury',
  name: 'Sapphire Luxury',
  description: 'Deep sapphire tones with luminous blue accents for a refined look',
  previewBg: '#081a3d',
  previewSidebar: '#0f2b54',
  previewAccent: '#4f93ff',
  vars: {
    '--background': '216 55% 10%',
    '--foreground': '210 35% 94%',
    '--card': '216 35% 15%',
    '--card-foreground': '210 35% 94%',
    '--primary': '215 95% 60%',
    '--primary-foreground': '220 30% 10%',
    '--sidebar': '216 45% 18%',
    '--sidebar-foreground': '210 30% 88%',
    '--sidebar-primary': '215 95% 60%',
    '--sidebar-primary-foreground': '220 30% 10%',
    '--sidebar-accent': '215 80% 40%',
    '--sidebar-accent-foreground': '220 30% 10%',
    '--border': '216 25% 22%',
    '--input': '216 30% 18%',
    '--ring': '215 95% 60%',
  },
},
{
  id: 'rose-gold',
  name: 'Rose Gold',
  description: 'Elegant rose gold theme with warm metallic highlights',
  previewBg: '#1f1318',
  previewSidebar: '#3d1f29',
  previewAccent: '#f9a8d4',
  vars: {
    '--background': '340 30% 10%',
    '--foreground': '25 20% 94%',
    '--card': '340 25% 14%',
    '--card-foreground': '25 20% 94%',
    '--primary': '340 80% 70%',
    '--primary-foreground': '340 30% 10%',
    '--sidebar': '340 20% 16%',
    '--sidebar-foreground': '25 20% 90%',
    '--sidebar-primary': '340 80% 70%',
    '--sidebar-primary-foreground': '340 30% 10%',
    '--sidebar-accent': '330 60% 40%',
    '--sidebar-accent-foreground': '25 20% 94%',
    '--border': '340 20% 22%',
    '--input': '340 20% 18%',
    '--ring': '340 80% 70%',
  },
},
{
  id: 'matrix',
  name: 'Matrix',
  description: 'High-contrast midnight green theme inspired by digital grid visuals',
  previewBg: '#081b0f',
  previewSidebar: '#0e2a14',
  previewAccent: '#22c55e',
  vars: {
    '--background': '150 60% 8%',
    '--foreground': '150 10% 96%',
    '--card': '150 35% 12%',
    '--card-foreground': '150 10% 96%',
    '--primary': '150 80% 55%',
    '--primary-foreground': '150 10% 10%',
    '--sidebar': '150 35% 16%',
    '--sidebar-foreground': '150 15% 90%',
    '--sidebar-primary': '150 80% 55%',
    '--sidebar-primary-foreground': '150 10% 10%',
    '--sidebar-accent': '150 60% 30%',
    '--sidebar-accent-foreground': '0 0% 100%',
    '--border': '150 25% 18%',
    '--input': '150 25% 15%',
    '--ring': '150 80% 55%',
  },
},
{
  id: 'aqua-mint',
  name: 'Aqua Mint',
  description: 'Fresh aqua palette with cool mint accents for a clean interface',
  previewBg: '#e8fffb',
  previewSidebar: '#1f5d56',
  previewAccent: '#2dd4bf',
  vars: {
    '--background': '175 70% 95%',
    '--foreground': '175 20% 18%',
    '--card': '180 30% 98%',
    '--card-foreground': '175 20% 18%',
    '--primary': '174 76% 45%',
    '--primary-foreground': '0 0% 100%',
    '--sidebar': '175 35% 18%',
    '--sidebar-foreground': '175 20% 92%',
    '--sidebar-primary': '174 76% 45%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '174 70% 60%',
    '--sidebar-accent-foreground': '0 0% 10%',
    '--border': '175 25% 86%',
    '--input': '175 20% 92%',
    '--ring': '174 76% 45%',
  },
},
{
  id: 'sunset-gradient',
  name: 'Sunset Gradient',
  description: 'Warm sunset hues with vibrant coral accent for an inspiring mood',
  previewBg: '#2b0a18',
  previewSidebar: '#4a1f34',
  previewAccent: '#fb7185',
  vars: {
    '--background': '330 45% 10%',
    '--foreground': '15 20% 95%',
    '--card': '330 40% 15%',
    '--card-foreground': '15 20% 95%',
    '--primary': '340 95% 65%',
    '--primary-foreground': '330 30% 10%',
    '--sidebar': '330 35% 18%',
    '--sidebar-foreground': '15 25% 90%',
    '--sidebar-primary': '340 95% 65%',
    '--sidebar-primary-foreground': '330 30% 10%',
    '--sidebar-accent': '340 85% 55%',
    '--sidebar-accent-foreground': '330 30% 10%',
    '--border': '330 30% 22%',
    '--input': '330 30% 18%',
    '--ring': '340 95% 65%',
  },
},
];
const STORAGE_KEY = 'erp_theme_id';
const LIGHT_THEMES = ['ocean', 'forest', 'amber', 'aqua-mint'];

export const applyTheme = (themeId: string) => {
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
  
  if (LIGHT_THEMES.includes(themeId)) {
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
  }
  
  localStorage.setItem(STORAGE_KEY, themeId);
};

export const initTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) applyTheme(saved);
};

export const ThemesPage: React.FC = () => {
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY) || 'neo');
  const [frontStyle, setFrontStyle] = useState<'classic' | 'modern' | 'compact'>('modern');

  useEffect(() => {
    applyTheme(activeId);
  }, [activeId]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    applyTheme(id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Themes</h2>
          <p className="text-sm text-muted-foreground">Customize the application color theme and front style</p>
        </div>

        {/* Color Themes */}
        <div className="rounded border border-border bg-card shadow-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Application Theme Color</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`group relative rounded-lg border-2 transition-all text-left overflow-hidden ${
                  activeId === theme.id ? 'border-primary shadow-md' : 'border-border hover:border-primary/50'
                }`}
              >
                {/* Preview card */}
                <div className="h-28 w-full relative" style={{ background: theme.previewBg }}>
                  {/* Sidebar strip */}
                  <div className="absolute left-0 top-0 h-full w-10 flex flex-col gap-1 p-1.5" style={{ background: theme.previewSidebar }}>
                    {[32, 24, 28, 20, 26].map((w, i) => (
                      <div key={i} className="rounded-sm h-2 opacity-60" style={{ width: w, background: i === 0 ? theme.previewAccent : '#ffffff40' }} />
                    ))}
                  </div>
                  {/* Content area */}
                  <div className="absolute left-12 right-2 top-2 space-y-1.5">
                    {/* KPI row */}
                    <div className="flex gap-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="flex-1 rounded h-7" style={{ background: '#ffffff90', border: '1px solid #e5e7eb30' }}>
                          <div className="m-1 h-2 rounded w-3/4" style={{ background: theme.previewAccent, opacity: 0.7 }} />
                          <div className="mx-1 h-1.5 rounded w-1/2 bg-gray-300/50 mt-0.5" />
                        </div>
                      ))}
                    </div>
                    {/* Table mock */}
                    <div className="rounded" style={{ background: '#ffffff80', border: '1px solid #e5e7eb30' }}>
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-1 p-1 border-b border-gray-200/30">
                          <div className="h-1.5 w-6 rounded" style={{ background: theme.previewAccent, opacity: 0.6 }} />
                          <div className="h-1.5 flex-1 rounded bg-gray-400/40" />
                          <div className="h-1.5 w-4 rounded bg-gray-400/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Active badge */}
                  {activeId === theme.id && (
                    <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-white"
                      style={{ background: theme.previewAccent }}>
                      <Check size={13} className="shrink-0" style={{ color: theme.previewBg }} />
                    </div>
                  )}
                </div>
                {/* Label */}
                <div className="px-3 py-2.5 bg-card">
                  <p className="text-sm font-semibold text-foreground">{theme.name}</p>
                  <p className="text-xs text-muted-foreground text-pretty mt-0.5">{theme.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Front Style */}
        <div className="rounded border border-border bg-card shadow-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Front Style</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {([
              { id: 'classic', label: 'Classic', desc: 'Traditional table-focused layout' },
              { id: 'modern', label: 'Modern', desc: 'Card-based modern interface' },
              { id: 'compact', label: 'Compact', desc: 'Dense, data-rich display' },
            ] as const).map(s => (
              <button key={s.id} onClick={() => setFrontStyle(s.id)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  frontStyle === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{s.label}</span>
                  {frontStyle === s.id && <Check size={16} className="text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Applied confirmation */}
        <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-4 py-3 text-sm">
          <Check size={16} className="text-chart-1 shrink-0" />
          <span>Theme <strong>{THEMES.find(t => t.id === activeId)?.name}</strong> is active. Changes are applied instantly and saved locally.</span>
        </div>
      </div>
    </MainLayout>
  );
};

