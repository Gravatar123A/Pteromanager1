import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import ServerCard from '@/react-app/components/ServerCard';
import ServerFilters, { FilterState } from '@/react-app/components/ServerFilters';
import AddServerModal from '@/react-app/components/AddServerModal';
import RealTimeIndicator from '@/react-app/components/RealTimeIndicator';
import AutomationPanel from '@/react-app/components/AutomationPanel';
import { ServerType } from '@/shared/types';
import { useServers } from '@/react-app/hooks/useServers';
import { Server, Activity, Zap, HardDrive, Plus, AlertCircle, Users } from 'lucide-react';

export default function Dashboard() {
  const { servers, loading, error, controlServer, addServer } = useServers();
  const [filteredServers, setFilteredServers] = useState<ServerType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    setFilteredServers(servers);
    setLastUpdate(new Date());
  }, [servers]);

  const handleFilterChange = (filters: FilterState) => {
    let filtered = [...servers];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        server.pterodactyl_id.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(server => filters.status.includes(server.status));
    }

    // Category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter(server => filters.category.includes(server.category));
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[filters.sortBy as keyof ServerType];
      let bValue = b[filters.sortBy as keyof ServerType];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return filters.sortOrder === 'asc' ? 1 : -1;
      if (bValue === null) return filters.sortOrder === 'asc' ? -1 : 1;

      if (typeof aValue === 'string' && aValue) aValue = aValue.toLowerCase();
      if (typeof bValue === 'string' && bValue) bValue = bValue.toLowerCase();

      if (filters.sortOrder === 'asc') {
        return (aValue ?? 0) < (bValue ?? 0) ? -1 : (aValue ?? 0) > (bValue ?? 0) ? 1 : 0;
      } else {
        return (aValue ?? 0) > (bValue ?? 0) ? -1 : (aValue ?? 0) < (bValue ?? 0) ? 1 : 0;
      }
    });

    setFilteredServers(filtered);
  };

  const handleServerAction = async (serverId: number, action: string) => {
    try {
      await controlServer(serverId, action);
    } catch (error) {
      console.error(`Failed to ${action} server:`, error);
      // You could add a toast notification here
    }
  };

  const handleAddServer = async (serverData: { pterodactyl_id: string; name: string; category: string }) => {
    try {
      await addServer(serverData);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add server:', error);
      // You could add error handling here
    }
  };

  const getStatusCounts = () => {
    const counts = {
      online: servers.filter(s => s.status === 'online').length,
      offline: servers.filter(s => s.status === 'offline').length,
      starting: servers.filter(s => s.status === 'starting').length,
      stopping: servers.filter(s => s.status === 'stopping').length,
    };
    return counts;
  };

  const getTotalResourceUsage = () => {
    const online = servers.filter(s => s.status === 'online');
    const gameServers = servers.filter(s => ['minecraft', 'gta', 'discord-bot'].includes(s.category));
    const onlineGameServers = gameServers.filter(s => s.status === 'online');
    
    return {
      cpu: Math.round(online.reduce((sum, s) => sum + s.cpu_usage, 0) / online.length) || 0,
      ram: online.reduce((sum, s) => sum + s.ram_usage, 0),
      ramLimit: online.reduce((sum, s) => sum + s.ram_limit, 0),
      disk: online.reduce((sum, s) => sum + s.disk_usage, 0),
      diskLimit: online.reduce((sum, s) => sum + s.disk_limit, 0),
      totalPlayers: onlineGameServers.reduce((sum, s) => sum + (s.player_count || 0), 0),
      gameServerCount: gameServers.length,
    };
  };

  const statusCounts = getStatusCounts();
  const resourceUsage = getTotalResourceUsage();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="loading-dots">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="glass rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Error Loading Servers</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          label="Total Servers"
          value={servers.length.toString()}
          subtitle={`${statusCounts.online} online`}
          gradient="from-blue-500 to-purple-600"
        />
        
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Players"
          value={resourceUsage.totalPlayers.toString()}
          subtitle={`${resourceUsage.gameServerCount} game servers`}
          gradient="from-cyan-500 to-blue-500"
        />
        
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Avg CPU Usage"
          value={`${resourceUsage.cpu}%`}
          subtitle="Across online servers"
          gradient="from-green-500 to-blue-500"
        />
        
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          label="Total RAM"
          value={`${Math.round(resourceUsage.ram / 1024 * 10) / 10}GB`}
          subtitle={`/ ${Math.round(resourceUsage.ramLimit / 1024 * 10) / 10}GB`}
          gradient="from-purple-500 to-pink-500"
        />
        
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Total Storage"
          value={`${Math.round(resourceUsage.disk / 1024 * 10) / 10}GB`}
          subtitle={`/ ${Math.round(resourceUsage.diskLimit / 1024 * 10) / 10}GB`}
          gradient="from-orange-500 to-red-500"
        />
      </div>

      {/* Real-time indicator and Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <RealTimeIndicator 
            isConnected={!error && !loading}
            lastUpdate={lastUpdate}
          />
          <div className="h-4 w-px bg-white/20" />
          <div className="flex-1">
            <ServerFilters 
              onFilterChange={handleFilterChange}
              serverCount={filteredServers.length}
            />
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-6 flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          <span>Add Server</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Server Grid */}
        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onAction={handleServerAction}
              />
            ))}
          </div>
          
          {filteredServers.length === 0 && (
            <div className="text-center py-12">
              <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No servers found</h3>
              <p className="text-gray-500">Try adjusting your filters or add some servers to get started.</p>
            </div>
          )}
        </div>
        
        {/* Automation Panel */}
        <div className="xl:col-span-1">
          <AutomationPanel />
        </div>
      </div>

      

      {/* Add Server Modal */}
      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddServer}
        />
      )}
    </Layout>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  gradient: string;
}

function StatCard({ icon, label, value, subtitle, gradient }: StatCardProps) {
  return (
    <div className="glass glass-hover rounded-xl p-6 group relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white`}>
            {icon}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
              {value}
            </div>
            <div className="text-xs text-gray-400">{subtitle}</div>
          </div>
        </div>
        
        <h3 className="text-gray-300 font-medium">{label}</h3>
      </div>
    </div>
  );
}
