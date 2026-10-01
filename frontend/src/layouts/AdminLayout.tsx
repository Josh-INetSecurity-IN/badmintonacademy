import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  UserRound,
  UserPlus,
  Layers,
  ClipboardCheck,
  IndianRupee,
  ShoppingCart,
  Trophy,
  BarChart3,
  Globe,
  Inbox,
  UserCog,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ShieldCheck,
  CalendarDays,
  CalendarRange,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/useAuth';
import { getUnreadCount } from '@/services/notifications';

interface NavChild {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  children?: NavChild[];
  roles?: string[];
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, end: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Students', to: '/admin/students', icon: <Users className="h-[18px] w-[18px]" /> },
      { label: 'Regular Players', to: '/admin/regular-players', icon: <UserRound className="h-[18px] w-[18px]" /> },
      { label: 'Guest Players', to: '/admin/guest-players', icon: <UserPlus className="h-[18px] w-[18px]" /> },
      { label: 'Attendance', to: '/admin/attendance', icon: <ClipboardCheck className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'Scheduling',
    items: [
      {
        label: 'Batches',
        icon: <Layers className="h-[18px] w-[18px]" />,
        children: [
          { label: 'Coaching Batches', to: '/admin/coaching-batches' },
          { label: 'Regular Play Batches', to: '/admin/regular-batches' },
          { label: 'Batch Calendar', to: '/admin/batch-calendar' },
        ],
      },
      { label: 'Courts', to: '/admin/courts', icon: <CalendarDays className="h-[18px] w-[18px]" /> },
      { label: 'Court Schedule', to: '/admin/court-schedule', icon: <CalendarRange className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        label: 'Fees & Payments',
        icon: <IndianRupee className="h-[18px] w-[18px]" />,
        children: [
          { label: 'Fee Invoices', to: '/admin/fees' },
          { label: 'Payments', to: '/admin/payments' },
          { label: 'Subscriptions', to: '/admin/subscriptions' },
        ],
      },
      {
        label: 'Shop',
        icon: <ShoppingCart className="h-[18px] w-[18px]" />,
        children: [
          { label: 'Sales', to: '/admin/sales' },
          { label: 'Products', to: '/admin/products' },
        ],
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Tournaments', to: '/admin/tournaments', icon: <Trophy className="h-[18px] w-[18px]" /> },
      { label: 'Reports & Analytics', to: '/admin/reports', icon: <BarChart3 className="h-[18px] w-[18px]" /> },
      { label: 'Website Content', to: '/admin/website', icon: <Globe className="h-[18px] w-[18px]" /> },
      { label: 'Enquiries', to: '/admin/enquiries', icon: <Inbox className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', to: '/admin/notifications', icon: <Bell className="h-[18px] w-[18px]" /> },
      { label: 'Users & Roles', to: '/admin/users', icon: <UserCog className="h-[18px] w-[18px]" />, roles: ['super_admin'] },
      { label: 'Settings', to: '/admin/settings', icon: <Settings className="h-[18px] w-[18px]" /> },
    ],
  },
];

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/admin/dashboard" className="flex items-center gap-3 overflow-hidden">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm text-white">
        <ShieldCheck className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-sm font-bold text-slate-900">Badminton Academy</div>
          <div className="truncate text-2xs font-medium uppercase tracking-wider text-slate-400">Admin Console</div>
        </div>
      )}
    </Link>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand any group containing the active route.
  const location = useLocation();
  useEffect(() => {
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((c) => location.pathname.startsWith(c.to))) {
          setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
        }
      });
    });
  }, [location.pathname]);

  const toggle = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(
          (item) => !item.roles || (user && item.roles.includes(user.role)),
        );
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {visibleItems.map((item) => {
                if (item.children) {
                  const isOpen = openGroups[item.label] || collapsed;
                  const childActive = item.children.some((c) => location.pathname.startsWith(c.to));

                  if (collapsed) {
                    return (
                      <li key={item.label}>
                        <NavLink
                          to={item.children[0].to}
                          title={item.label}
                          onClick={onNavigate}
                          className={cn(
                            'flex items-center justify-center rounded-lg p-2.5 text-slate-500 transition-colors',
                            'hover:bg-slate-100 hover:text-slate-900',
                            childActive && 'bg-primary-subtle text-primary-700',
                          )}
                        >
                          {item.icon}
                        </NavLink>
                      </li>
                    );
                  }

                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => toggle(item.label)}
                        className={cn(
                          'nav-link w-full',
                          childActive && !isOpen && 'bg-slate-100 text-slate-900',
                        )}
                      >
                        {item.icon}
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')}
                        />
                      </button>
                      {isOpen && (
                        <ul className="ml-[22px] mt-1 space-y-0.5 border-l border-slate-200 pl-3">
                          {item.children.map((child) => (
                            <li key={child.to}>
                              <NavLink
                                to={child.to}
                                onClick={onNavigate}
                                className={({ isActive }) =>
                                  cn('nav-link-child', isActive ? 'nav-link-active' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')
                                }
                              >
                                {child.label}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to!}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
                    >
                      {item.icon}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  const initials = user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}` : 'A';

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-slate-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-xs font-semibold text-slate-900">
            {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
          </span>
          <span className="block text-2xs font-medium capitalize text-slate-400">
            {user?.role?.replace('_', ' ') ?? 'admin'}
          </span>
        </span>
        <ChevronDown className={cn('hidden h-4 w-4 text-slate-400 transition-transform md:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 animate-slide-down overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user ? `${user.firstName} ${user.lastName}` : 'Admin'}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <Link
            to="/"
            target="_blank"
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Globe className="h-4 w-4" /> View Website
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-300" />
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive-subtle"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => getUnreadCount().then((res) => res.count ?? 0),
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 bg-white',
          'transition-[width] duration-300 ease-smooth lg:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-slate-100 px-4',
            collapsed && 'justify-center px-0',
          )}
        >
          <BrandMark collapsed={collapsed} />
        </div>

        <SidebarNav collapsed={collapsed} />

        <div className="shrink-0 border-t border-slate-100 p-3">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
              'text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-slide-down flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4">
              <BrandMark collapsed={false} />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className={cn('transition-[margin] duration-300 ease-smooth', collapsed ? 'lg:ml-[72px]' : 'lg:ml-64')}>
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate font-display text-sm font-bold text-slate-900">Badminton Academy</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              <Globe className="h-4 w-4" />
              View Site
            </Link>

            <NavLink
              to="/admin/notifications"
              className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount != null && unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>

            <div className="ml-1 border-l border-slate-200 pl-2 sm:ml-2 sm:pl-3">
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="page-container py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
