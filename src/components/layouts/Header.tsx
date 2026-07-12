import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, User, LogOut, KeyRound, Settings, ChevronDown } from 'lucide-react';
import { SidebarToggle } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getNotifications, getMessages, markNotificationRead, markMessageRead } from '@/lib/api';
import type { Notification, Message } from '@/types/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  onMobileMenuOpen: () => void;
}

const DropdownPanel: React.FC<{ open: boolean; children: React.ReactNode; className?: string }> = ({ open, children, className }) => {
  if (!open) return null;
  return (
    <div className={cn(
      'absolute right-0 top-full z-50 mt-2 rounded border border-border bg-card shadow-hover',
      className
    )}>
      {children}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onSidebarToggle, onMobileMenuOpen }) => {
  const { user, profile, companySettings, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const profRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getNotifications(user.id).then(r => setNotifications(r.data));
      getMessages(user.id).then(r => setMessages(r.data));
    }
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (msgRef.current && !msgRef.current.contains(e.target as Node)) setShowMessages(false);
      if (profRef.current && !profRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const unreadMessages = messages.filter(m => !m.is_read).length;

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
  };

  const handleMsgClick = async (m: Message) => {
    if (!m.is_read && user && m.to_user_id === user.id) {
      await markMessageRead(m.id);
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x));
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarToggle
          collapsed={sidebarCollapsed}
          onToggle={onSidebarToggle}
          onMobileOpen={onMobileMenuOpen}
        />
        <h1 className="hidden text-sm font-semibold text-foreground md:block truncate">
          {companySettings?.company_name || 'ERP System'}
        </h1>
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowMessages(false); setShowProfile(false); }}
            className="relative flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Bell size={18} />
            {unreadNotifs > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </button>
          <DropdownPanel open={showNotifs} className="w-80">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">Notifications</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
              ) : notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm leading-snug', !n.is_read && 'font-semibold')}>{n.title}</p>
                    {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </button>
              ))}
            </div>
          </DropdownPanel>
        </div>

        {/* Messages */}
        <div className="relative" ref={msgRef}>
          <button
            onClick={() => { setShowMessages(v => !v); setShowNotifs(false); setShowProfile(false); }}
            className="relative flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <MessageSquare size={18} />
            {unreadMessages > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
          <DropdownPanel open={showMessages} className="w-80">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold">Messages</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No messages</p>
              ) : messages.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMsgClick(m)}
                  className={cn(
                    'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-muted',
                    !m.is_read && user && m.to_user_id === user.id && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm leading-snug truncate', !m.is_read && 'font-semibold')}>{m.subject || '(No subject)'}</p>
                    {!m.is_read && user && m.to_user_id === user.id && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{m.body}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</p>
                </button>
              ))}
            </div>
          </DropdownPanel>
        </div>

        {/* Profile */}
        <div className="relative ml-1" ref={profRef}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); setShowMessages(false); }}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-medium leading-tight truncate max-w-[120px]">{profile?.full_name || profile?.email || 'User'}</p>
              {profile?.designation && (
                <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">{profile.designation}</p>
              )}
            </div>
            <ChevronDown size={14} className="hidden text-muted-foreground md:block" />
          </button>
          <DropdownPanel open={showProfile} className="w-52">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted"
              >
                <User size={15} className="text-muted-foreground" />
                Account Settings
              </Link>
              <Link
                to="/change-password"
                onClick={() => setShowProfile(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted"
              >
                <KeyRound size={15} className="text-muted-foreground" />
                Change Password
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-muted"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </DropdownPanel>
        </div>
      </div>
    </header>
  );
};
