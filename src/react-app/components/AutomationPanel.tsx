import { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  Square, 
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';

interface AutomationSummary {
  total: number;
  byCategory: Record<string, {
    total: number;
    online: number;
    offline: number;
    totalPlayers: number;
    avgCpu: number;
  }>;
  potentialActions: number;
}

export default function AutomationPanel() {
  const [summary, setSummary] = useState<AutomationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/servers/automation/summary', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch automation summary:', error);
    }
  };

  const runAutomationCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/servers/automation/check', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        setLastRun(new Date());
        await fetchSummary();
        
        // Show result notification (you could implement a toast system here)
        console.log('Automation result:', result);
      }
    } catch (error) {
      console.error('Automation check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // Set up periodic summary refresh
    const interval = setInterval(fetchSummary, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  if (!summary) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/20 rounded w-1/3"></div>
          <div className="h-8 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Automation</h3>
            <p className="text-sm text-gray-400">Inactive server management</p>
          </div>
        </div>
        
        <button
          onClick={runAutomationCheck}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white rounded-lg transition-colors"
        >
          <Settings className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Running...' : 'Run Check'}</span>
        </button>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(summary.byCategory).map(([category, stats]) => {
          if (stats.total === 0) return null;
          
          const categoryEmoji = {
            minecraft: '⛏️',
            gta: '🚗',
            website: '🌐',
            'discord-bot': '🤖',
            database: '🗄️',
            other: '📦'
          }[category] || '📦';

          return (
            <div key={category} className="glass rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{categoryEmoji}</span>
                <span className="text-sm font-medium text-white capitalize">
                  {category.replace('-', ' ')}
                </span>
              </div>
              
              <div className="space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="text-white">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Online:</span>
                  <span className="text-green-400">{stats.online}</span>
                </div>
                {(['minecraft', 'gta', 'discord-bot'].includes(category)) && (
                  <div className="flex justify-between">
                    <span>Players:</span>
                    <span className="text-blue-400">{stats.totalPlayers}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Avg CPU:</span>
                  <span className="text-purple-400">{stats.avgCpu}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Automation Rules */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Active Rules</h4>
        
        <AutomationRule
          icon="⛏️"
          name="Minecraft Auto Shutdown"
          description="Shutdown after 30min with no players"
          status="active"
        />
        
        <AutomationRule
          icon="🚗"
          name="GTA Auto Shutdown"
          description="Shutdown after 1hr with no players"
          status="active"
        />
        
        <AutomationRule
          icon="🤖"
          name="Daily Bot Restart"
          description="Restart daily at 6:00 AM"
          status="active"
        />
        
        <AutomationRule
          icon="🌐"
          name="Website Monitor"
          description="Restart if unresponsive for 5min"
          status="active"
        />
      </div>

      {lastRun && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Last check: {lastRun.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface AutomationRuleProps {
  icon: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'warning';
}

function AutomationRule({ icon, name, description, status }: AutomationRuleProps) {
  const statusColors = {
    active: 'text-green-400',
    inactive: 'text-gray-400',
    warning: 'text-yellow-400'
  };

  const statusIcons = {
    active: <CheckCircle className="w-3 h-3" />,
    inactive: <Square className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />
  };

  return (
    <div className="flex items-center justify-between p-3 glass rounded-lg">
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="text-sm font-medium text-white">{name}</div>
          <div className="text-xs text-gray-400">{description}</div>
        </div>
      </div>
      
      <div className={`flex items-center space-x-1 ${statusColors[status]}`}>
        {statusIcons[status]}
        <span className="text-xs capitalize">{status}</span>
      </div>
    </div>
  );
}
