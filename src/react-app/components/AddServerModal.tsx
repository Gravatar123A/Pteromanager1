import { useState } from 'react';
import { X, Server } from 'lucide-react';

interface AddServerModalProps {
  onClose: () => void;
  onAdd: (server: { pterodactyl_id: string; name: string; category: string }) => Promise<void>;
}

const categories = [
  { value: 'minecraft', label: 'Minecraft', icon: '⛏️' },
  { value: 'gta', label: 'GTA', icon: '🚗' },
  { value: 'website', label: 'Website', icon: '🌐' },
  { value: 'discord-bot', label: 'Discord Bot', icon: '🤖' },
  { value: 'database', label: 'Database', icon: '🗄️' },
  { value: 'other', label: 'Other', icon: '📦' },
];

export default function AddServerModal({ onClose, onAdd }: AddServerModalProps) {
  const [formData, setFormData] = useState({
    pterodactyl_id: '',
    name: '',
    category: 'minecraft',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pterodactyl_id.trim() || !formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd(formData);
    } catch (error) {
      console.error('Failed to add server:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-dark rounded-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Add New Server</h2>
            <p className="text-gray-400 text-sm">Connect a server from your Pterodactyl panel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pterodactyl Server ID
            </label>
            <input
              type="text"
              value={formData.pterodactyl_id}
              onChange={(e) => setFormData(prev => ({ ...prev, pterodactyl_id: e.target.value }))}
              placeholder="e.g., srv_abc123"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in your Pterodactyl panel under Server Settings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Awesome Server"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value} className="bg-gray-800">
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
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
              disabled={isSubmitting || !formData.pterodactyl_id.trim() || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
