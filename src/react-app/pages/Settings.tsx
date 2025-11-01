import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import { Settings as SettingsIcon, Server, Bell, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ApiConfig {
  pterodactyl_api_url: string | null;
  pterodactyl_client_key: string | null;
  is_active: boolean;
}

export default function Settings() {
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    pterodactyl_api_url: null,
    pterodactyl_client_key: null,
    is_active: false
  });
  const [formData, setFormData] = useState({
    pterodactyl_api_url: '',
    pterodactyl_api_key: '',
    pterodactyl_client_key: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchApiConfig();
  }, []);

  const fetchApiConfig = async () => {
    try {
      const response = await fetch('/api/user/api-config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const config = await response.json();
        setApiConfig(config);
        setFormData({
          pterodactyl_api_url: config.pterodactyl_api_url || '',
          pterodactyl_api_key: '',
          pterodactyl_client_key: config.pterodactyl_client_key || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch API config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/api-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        await fetchApiConfig();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncServers = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const response = await fetch('/api/servers/sync', {
        method: 'POST',
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync servers' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400">Configure your PteroCTRL dashboard</p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`glass rounded-lg p-4 flex items-center space-x-3 ${
            message.type === 'success' ? 'border-green-500/50' : 'border-red-500/50'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {message.text}
            </span>
          </div>
        )}

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pterodactyl API */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Pterodactyl API</h3>
                <p className="text-sm text-gray-400">Configure your Pterodactyl panel connection</p>
                {apiConfig.is_active && (
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveApiConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Panel URL
                </label>
                <input
                  type="url"
                  placeholder="https://panel.example.com"
                  value={formData.pterodactyl_api_url}
                  onChange={(e) => setFormData({ ...formData, pterodactyl_api_url: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your Pterodactyl panel URL (without trailing slash)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Application API Key
                </label>
                <input
                  type="password"
                  placeholder="ptla_••••••••••••••••••••••••••••••••"
                  value={formData.pterodactyl_api_key}
                  onChange={(e) => setFormData({ ...formData, pterodactyl_api_key: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Application API key for server management
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="ptlc_••••••••••••••••••••••••••••••••"
                  value={formData.pterodactyl_client_key}
                  onChange={(e) => setFormData({ ...formData, pterodactyl_client_key: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Client API key for real-time resource monitoring
                </p>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save API Configuration</span>
                )}
              </button>
            </form>

            {/* Sync Servers Button */}
            {apiConfig.is_active && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={handleSyncServers}
                  disabled={syncing}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {syncing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <span>Sync Servers from Pterodactyl</span>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Import all servers from your Pterodactyl panel
                </p>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <p className="text-sm text-gray-400">Control notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Server Status Changes</p>
                  <p className="text-sm text-gray-400">Get notified when servers start, stop, or crash</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Resource Alerts</p>
                  <p className="text-sm text-gray-400">Alert when CPU or memory usage is high</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Security Alerts</p>
                  <p className="text-sm text-gray-400">Get notified of security-related events</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Security</h3>
                <p className="text-sm text-gray-400">Manage security settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-400">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
                  Enable 2FA
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Session Management</p>
                  <p className="text-sm text-gray-400">View and manage active sessions</p>
                </div>
                <button className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors text-sm">
                  View Sessions
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">API Access</p>
                  <p className="text-sm text-gray-400">Generate API keys for external access</p>
                </div>
                <button className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors text-sm">
                  Manage Keys
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Preferences */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Dashboard</h3>
                <p className="text-sm text-gray-400">Customize your dashboard experience</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Refresh Interval
                </label>
                <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="30" className="bg-gray-800">30 seconds</option>
                  <option value="60" className="bg-gray-800" selected>1 minute</option>
                  <option value="300" className="bg-gray-800">5 minutes</option>
                  <option value="600" className="bg-gray-800">10 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Server View
                </label>
                <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="grid" className="bg-gray-800" selected>Grid View</option>
                  <option value="list" className="bg-gray-800">List View</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto-refresh</p>
                  <p className="text-sm text-gray-400">Automatically refresh server data</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
