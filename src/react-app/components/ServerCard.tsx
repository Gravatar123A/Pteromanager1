import { useState } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  MoreVertical,
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  Users
} from 'lucide-react';
import { ServerType } from '@/shared/types';

interface ServerCardProps {
  server: ServerType;
  onAction: (serverId: number, action: string) => void;
}

export default function ServerCard({ server, onAction }: ServerCardProps) {
  const [showActions, setShowActions] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-400/20';
      case 'offline': return 'text-red-400 bg-red-400/20';
      case 'starting': return 'text-yellow-400 bg-yellow-400/20';
      case 'stopping': return 'text-orange-400 bg-orange-400/20';
      case 'suspended': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'minecraft': return '⛏️';
      case 'gta': return '🚗';
      case 'website': return '🌐';
      case 'discord-bot': return '🤖';
      case 'database': return '🗄️';
      default: return '📦';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  

  return (
    <div className="glass glass-hover rounded-xl p-6 group relative overflow-hidden">
      {/* Background gradient based on status */}
      <div className={`absolute inset-0 opacity-5 ${
        server.status === 'online' ? 'bg-gradient-to-br from-green-400 to-blue-400' :
        server.status === 'offline' ? 'bg-gradient-to-br from-red-400 to-gray-400' :
        'bg-gradient-to-br from-yellow-400 to-orange-400'
      }`} />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 glass rounded-lg flex items-center justify-center text-2xl">
            {getCategoryIcon(server.category)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
              {server.name}
            </h3>
            <p className="text-sm text-gray-400 capitalize">{server.category}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-2 ${getStatusColor(server.status)}`}>
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="capitalize">{server.status}</span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-dark rounded-lg border border-white/10 py-2 z-20">
                <ActionButton 
                  icon={<Play className="w-4 h-4" />} 
                  label="Start" 
                  onClick={() => onAction(server.id, 'start')}
                  disabled={server.status === 'online'}
                />
                <ActionButton 
                  icon={<Square className="w-4 h-4" />} 
                  label="Stop" 
                  onClick={() => onAction(server.id, 'stop')}
                  disabled={server.status === 'offline'}
                  danger
                />
                <ActionButton 
                  icon={<RotateCcw className="w-4 h-4" />} 
                  label="Restart" 
                  onClick={() => onAction(server.id, 'restart')}
                  disabled={server.status === 'offline'}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="space-y-3 relative z-10">
        <ResourceBar
          icon={<Cpu className="w-4 h-4" />}
          label="CPU"
          value={server.cpu_usage}
          max={100}
          unit="%"
          color="blue"
        />
        
        <ResourceBar
          icon={<Activity className="w-4 h-4" />}
          label="RAM"
          value={server.ram_usage}
          max={server.ram_limit}
          unit="MB"
          color="purple"
          showBytes
        />
        
        <ResourceBar
          icon={<HardDrive className="w-4 h-4" />}
          label="Disk"
          value={server.disk_usage}
          max={server.disk_limit}
          unit="MB"
          color="green"
          showBytes
        />
        
        {/* Players (for game servers) */}
        {(['minecraft', 'gta', 'discord-bot'].includes(server.category)) && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>Players</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-semibold">
                  {server.player_count || 0}
                </span>
              </div>
              <span className="text-gray-400 text-xs">online</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-400">
            <Wifi className="w-4 h-4" />
            <span>Network</span>
          </div>
          <div className="flex space-x-4 text-xs">
            <span className="text-green-400">↓ {formatBytes(server.network_rx)}</span>
            <span className="text-blue-400">↑ {formatBytes(server.network_tx)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10 relative z-10">
        <span className="text-xs text-gray-400">
          Uptime: {Math.floor(server.uptime / 3600)}h {Math.floor((server.uptime % 3600) / 60)}m
        </span>
        <span className="text-xs text-gray-400">
          ID: {server.pterodactyl_id}
        </span>
      </div>
    </div>
  );
}

interface ResourceBarProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  unit: string;
  color: 'blue' | 'purple' | 'green' | 'red';
  showBytes?: boolean;
}

function ResourceBar({ icon, label, value, max, unit, color, showBytes }: ResourceBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-500/30 border-blue-500/50';
      case 'purple': return 'bg-purple-500/30 border-purple-500/50';
      case 'green': return 'bg-green-500/30 border-green-500/50';
      case 'red': return 'bg-red-500/30 border-red-500/50';
      default: return 'bg-gray-500/30 border-gray-500/50';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2 text-gray-400 w-16">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-300">
            {showBytes ? `${formatBytes(value)} / ${formatBytes(max)}` : `${value}${unit}`}
          </span>
          <span className="text-gray-400">{percentage}%</span>
        </div>
        
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColorClasses(color)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

function ActionButton({ icon, label, onClick, disabled, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
        disabled 
          ? 'text-gray-500 cursor-not-allowed' 
          : danger
            ? 'text-red-400 hover:bg-red-400/10'
            : 'text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
