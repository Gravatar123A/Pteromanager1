import { ReactNode } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate, useLocation } from 'react-router';
import { Server, Activity, Settings, Search, LogOut, Webhook } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 glass-dark border-r border-white/10 z-50">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center animate-glow">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PteroCTRL</h1>
              <p className="text-xs text-gray-400">Management Dashboard</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            <NavItem 
              icon={<Activity />} 
              label="Dashboard" 
              active={location.pathname === '/'} 
              onClick={() => navigate('/')}
            />
            <NavItem 
              icon={<Webhook />} 
              label="Webhooks" 
              active={location.pathname === '/webhooks'} 
              onClick={() => navigate('/webhooks')}
            />
            <NavItem 
              icon={<Settings />} 
              label="Settings" 
              active={location.pathname === '/settings'} 
              onClick={() => navigate('/settings')}
            />
          </nav>
          
          {/* User section */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="glass rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <img 
                  src={user?.google_user_data.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || '')}&background=667eea&color=fff`}
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.google_user_data.name || user?.email}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 min-h-screen">
        {/* Top Bar */}
        <div className="glass-dark border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-semibold text-white">Server Dashboard</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search servers..."
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-300">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <div 
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
        active 
          ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      onClick={onClick}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className="font-medium">{label}</span>
    </div>
  );
}
