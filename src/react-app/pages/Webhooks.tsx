import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import { Webhook, Plus, Edit, Trash2, AlertCircle, ExternalLink, X } from 'lucide-react';

interface WebhookConfig {
  id: number;
  name: string;
  webhook_url: string;
  is_active: boolean;
  event_types: string;
  created_at: string;
  updated_at: string;
}

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch webhooks: ${response.status}`);
      }

      const data = await response.json();
      setWebhooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const addWebhook = async (webhookData: {
    name: string;
    webhook_url: string;
    event_types: string[];
    is_active: boolean;
  }) => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.status}`);
      }

      await fetchWebhooks();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add webhook:', error);
    }
  };

  const eventTypes = [
    { value: 'start', label: 'Server Start', description: 'When a server is started' },
    { value: 'stop', label: 'Server Stop', description: 'When a server is stopped' },
    { value: 'restart', label: 'Server Restart', description: 'When a server is restarted' },
    { value: 'crash', label: 'Server Crash', description: 'When a server crashes unexpectedly' },
    { value: 'backup', label: 'Backup Complete', description: 'When a backup is completed' },
    { value: 'error', label: 'System Error', description: 'When system errors occur' },
    { value: 'warning', label: 'System Warning', description: 'When system warnings occur' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Discord Webhooks</h1>
            <p className="text-gray-400">Configure Discord notifications for server events</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>Add Webhook</span>
          </button>
        </div>

        {/* Webhooks List */}
        <div className="glass rounded-xl p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-dots">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Error Loading Webhooks</h3>
              <p className="text-gray-400">{error}</p>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No webhooks configured</h3>
              <p className="text-gray-500">Add your first Discord webhook to start receiving notifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => {
                const events = JSON.parse(webhook.event_types) as string[];
                return (
                  <div key={webhook.id} className="glass-hover rounded-lg p-6 border border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Webhook className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{webhook.name}</h3>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                              <span className="text-sm text-gray-400">
                                {webhook.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-3">
                          {webhook.webhook_url.replace(/\/webhooks\/.*/, '/webhooks/***')}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {events.map((event) => {
                            const eventInfo = eventTypes.find(et => et.value === event);
                            return (
                              <span
                                key={event}
                                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs"
                              >
                                {eventInfo?.label || event}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="glass rounded-xl p-6 border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-2">How to set up Discord webhooks</h3>
              <ol className="text-sm text-gray-300 space-y-1">
                <li>1. Go to your Discord server settings</li>
                <li>2. Click on "Integrations" → "Webhooks"</li>
                <li>3. Create a new webhook and copy the URL</li>
                <li>4. Paste the URL here and select the events you want to monitor</li>
              </ol>
              <a 
                href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-400 hover:text-blue-300 text-sm mt-2"
              >
                <span>Learn more about Discord webhooks</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Add Webhook Modal */}
        {showAddModal && (
          <AddWebhookModal
            onClose={() => setShowAddModal(false)}
            onAdd={addWebhook}
            eventTypes={eventTypes}
          />
        )}
      </div>
    </Layout>
  );
}

interface AddWebhookModalProps {
  onClose: () => void;
  onAdd: (webhook: {
    name: string;
    webhook_url: string;
    event_types: string[];
    is_active: boolean;
  }) => Promise<void>;
  eventTypes: Array<{
    value: string;
    label: string;
    description: string;
  }>;
}

function AddWebhookModal({ onClose, onAdd, eventTypes }: AddWebhookModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    webhook_url: '',
    event_types: ['start', 'stop', 'crash'] as string[],
    is_active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.webhook_url.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } catch (error) {
      console.error('Failed to add webhook:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEventType = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      event_types: prev.event_types.includes(eventType)
        ? prev.event_types.filter(et => et !== eventType)
        : [...prev.event_types, eventType]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-dark rounded-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
            <Webhook className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Add Discord Webhook</h2>
            <p className="text-gray-400 text-sm">Configure notifications for server events</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Webhook Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Server Alerts"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Discord Webhook URL
            </label>
            <input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Event Types
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventTypes.map((eventType) => (
                <label
                  key={eventType.value}
                  className="flex items-start space-x-3 p-3 glass rounded-lg cursor-pointer hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={formData.event_types.includes(eventType.value)}
                    onChange={() => toggleEventType(eventType.value)}
                    className="w-4 h-4 mt-0.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white font-medium text-sm">{eventType.label}</div>
                    <div className="text-gray-400 text-xs">{eventType.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              Enable webhook immediately
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.webhook_url.trim() || formData.event_types.length === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
