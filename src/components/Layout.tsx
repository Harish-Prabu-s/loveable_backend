import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Wallet, Gamepad2, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/discover', icon: Search, label: 'Discover' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];
  if (user?.is_superuser) {
    navItems.push({ path: '/admin', icon: Shield, label: 'Admin' });
  }

  const hideNav =
    location.pathname.startsWith('/name') ||
    location.pathname.startsWith('/language') ||
    location.pathname.startsWith('/email');

  return (
    <div className="min-h-screen pb-20 bg-background text-foreground">
      {children}
      {!hideNav && (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-primary-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
  );
}
