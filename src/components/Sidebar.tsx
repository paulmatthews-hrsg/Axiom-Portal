import { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, AlertTriangle, Wrench, Navigation, Settings, ChevronLeft, ChevronRight, CircleUser as UserCircle, ChevronDown, Shield, Sun, Moon, List, PackagePlus, TrendingDown, FileSignature } from 'lucide-react';
import { APP_NAME } from '../constants/config';
import { useRBAC, MOCK_USERS, type UserRole } from '../contexts/RBACContext';
import { useNavigate } from '../contexts/NavigationContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavigationChild {
  id: string;
  label: string;
  icon?: any;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  children?: NavigationChild[];
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Global Command', icon: LayoutDashboard },
  {
    id: 'fleet-assets',
    label: 'Fleet Assets',
    icon: Truck,
    children: [
      { id: 'fleet-assets-registry', label: 'Registry', icon: List },
      { id: 'fleet-assets-acquisition', label: 'Acquisition', icon: PackagePlus },
      { id: 'fleet-assets-disposal', label: 'De-fleet & Disposal', icon: TrendingDown },
    ],
  },
  { id: 'infringement-triage', label: 'Infringement Triage', icon: AlertTriangle },
  { id: 'bpa-management', label: 'BPA Management', icon: FileSignature },
  { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
  { id: 'logistics', label: 'Logistics & Dispatch', icon: Navigation },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentView, onNavigate, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['fleet-assets']));
  const { currentUser, switchRole } = useRBAC();
  const { navigateTo } = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleNavigate = (view: string) => {
    navigateTo(view);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'gigcar_manager':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'marine_cor':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'gigcar_manager':
        return 'GigCar Manager';
      case 'marine_cor':
        return 'Marine COR';
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          antialiased bg-gradient-to-b from-slate-950 to-slate-900 dark:from-slate-950 dark:to-black text-slate-200 h-screen flex flex-col border-r border-slate-800 dark:border-slate-900 transition-all duration-300
          fixed md:relative z-50
          ${collapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">{APP_NAME[0]}</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:block p-1.5 hover:bg-slate-800 rounded-lg transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={18} strokeWidth={1.75} /> : <ChevronLeft size={18} strokeWidth={1.75} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-hide">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedMenus.has(item.id);
          const isChildActive = hasChildren && item.children.some(child => currentView === child.id);

          return (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (hasChildren && !collapsed) {
                    toggleMenu(item.id);
                  } else {
                    handleNavigate(item.id);
                  }
                }}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 transform-gpu ${
                  isActive || isChildActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {/* Left border active indicator */}
                {(isActive || isChildActive) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                )}

                <Icon size={20} strokeWidth={1.75} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronDown
                        size={16}
                        strokeWidth={1.75}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </>
                )}

                {/* Custom tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Sub-menu */}
              {hasChildren && !collapsed && (
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="py-1 space-y-0.5 border-l border-slate-800 ml-5">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildItemActive = currentView === child.id;

                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNavigate(child.id)}
                          className={`w-full flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg transition-all duration-200 group relative transform-gpu ${
                            isChildItemActive
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                          }`}
                        >
                          {/* Active indicator dot on the tree line */}
                          <div
                            className={`absolute left-0 w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                              isChildItemActive
                                ? 'bg-indigo-400 scale-100'
                                : 'bg-slate-600 scale-0 group-hover:scale-100'
                            }`}
                          />
                          {ChildIcon && <ChildIcon size={16} strokeWidth={1.75} className="flex-shrink-0" />}
                          <span className="text-sm truncate">{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800">
        <div className="p-4 relative">
          {!collapsed ? (
            <div>
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCircle size={24} strokeWidth={1.75} className="text-slate-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-200">{currentUser.name}</p>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
                <ChevronDown
                  size={16}
                  strokeWidth={1.75}
                  className={`text-slate-400 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {roleMenuOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Shield size={14} strokeWidth={1.75} className="text-slate-400" />
                      <span className="text-xs font-semibold text-slate-300">Switch Role (Demo)</span>
                    </div>
                  </div>
                  <div className="p-1">
                    {(Object.keys(MOCK_USERS) as UserRole[]).map((role) => {
                      const user = MOCK_USERS[role];
                      const isActive = currentUser.role === role;
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            switchRole(role);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isActive ? 'bg-white/20' : 'bg-slate-800'
                            }`}
                          >
                            <UserCircle size={18} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs opacity-75">{getRoleLabel(role)}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeColor(role)}`}
                          >
                            {user.allowedFleets.join(', ')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={toggleTheme}
                className="w-full mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-all duration-200 group"
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {isDarkMode ? (
                    <Moon size={18} strokeWidth={1.75} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                  ) : (
                    <Sun size={18} strokeWidth={1.75} className="text-yellow-500 group-hover:text-yellow-400 transition-colors" />
                  )}
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </button>

              <div className="mt-4 text-xs text-slate-500">
                <p className="font-medium">Version 1.0.0</p>
                <p className="mt-1">Enterprise Back-Office Portal</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="group relative w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <UserCircle size={24} strokeWidth={1.75} className="text-slate-400" />
                {/* Custom tooltip for collapsed state */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap">
                  {currentUser.name}
                </div>
              </button>
              <button
                onClick={toggleTheme}
                className="group relative w-full flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {isDarkMode ? (
                  <Moon size={20} strokeWidth={1.75} className="text-blue-400" />
                ) : (
                  <Sun size={20} strokeWidth={1.75} className="text-yellow-500" />
                )}
                {/* Custom tooltip for collapsed state */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap">
                  {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
