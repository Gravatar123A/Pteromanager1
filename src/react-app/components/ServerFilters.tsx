import { useState } from 'react';
import { Search, Filter, Power, Square, RotateCcw } from 'lucide-react';

export interface FilterState {
  search: string;
  status: string[];
  category: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface ServerFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  serverCount: number;
}

export default function ServerFilters({ onFilterChange, serverCount }: ServerFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    category: [],
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const handleBulkAction = async (action: string, category?: string, inactiveOnly?: boolean) => {
    try {
      const response = await fetch('/api/servers/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          category: category || 'all',
          inactive_only: inactiveOnly || false
        })
      });

      if (response.ok) {
        // Refresh the page to show updated server states
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Bulk action failed: ${error.error}`);
      }
    } catch (error) {
      alert('Failed to perform bulk action');
      console.error('Bulk action error:', error);
    }
    setShowBulkActions(false);
  };

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'offline', label: 'Offline', color: 'bg-red-500' },
    { value: 'starting', label: 'Starting', color: 'bg-yellow-500' },
    { value: 'stopping', label: 'Stopping', color: 'bg-orange-500' },
    { value: 'suspended', label: 'Suspended', color: 'bg-gray-500' },
  ];

  const categoryOptions = [
    { value: 'minecraft', label: 'Minecraft', icon: '⛏️' },
    { value: 'gta', label: 'GTA', icon: '🚗' },
    { value: 'website', label: 'Website', icon: '🌐' },
    { value: 'discord-bot', label: 'Discord Bot', icon: '🤖' },
    { value: 'database', label: 'Database', icon: '🗄️' },
    { value: 'other', label: 'Other', icon: '📦' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'status', label: 'Status' },
    { value: 'category', label: 'Category' },
    { value: 'cpu_usage', label: 'CPU Usage' },
    { value: 'ram_usage', label: 'RAM Usage' },
    { value: 'created_at', label: 'Created Date' },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search servers..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Quick Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg border transition-colors flex items-center space-x-2 ${
              showFilters 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'border-white/20 text-gray-300 hover:bg-white/5'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="px-4 py-3 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 transition-colors flex items-center space-x-2"
            >
              <Power className="w-4 h-4" />
              <span>Bulk Actions</span>
            </button>

            {showBulkActions && (
              <div className="absolute right-0 top-full mt-2 w-64 glass-dark rounded-lg border border-white/10 py-2 z-20">
                <div className="px-4 py-2 text-sm text-gray-400 border-b border-white/10">
                  Power Actions
                </div>
                <BulkActionButton
                  icon={<Power className="w-4 h-4" />}
                  label="Start All Offline"
                  onClick={() => handleBulkAction('start', 'all', true)}
                />
                <BulkActionButton
                  icon={<Square className="w-4 h-4" />}
                  label="Stop All Online"
                  onClick={() => handleBulkAction('stop', 'all', false)}
                  danger
                />
                <BulkActionButton
                  icon={<RotateCcw className="w-4 h-4" />}
                  label="Restart All Online"
                  onClick={() => handleBulkAction('restart', 'all', false)}
                />
                
                <div className="px-4 py-2 text-sm text-gray-400 border-b border-t border-white/10 mt-2">
                  Category Actions
                </div>
                {categoryOptions.map((category) => (
                  <div key={category.value} className="px-4 py-2">
                    <div className="text-xs text-gray-400 mb-1">
                      {category.icon} {category.label}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleBulkAction('start', category.value, true)}
                        className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleBulkAction('stop', category.value, false)}
                        className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                      >
                        Stop
                      </button>
                      <button
                        onClick={() => handleBulkAction('restart', category.value, false)}
                        className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass rounded-lg p-4 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label key={status.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status.value)}
                      onChange={(e) => {
                        const newStatus = e.target.checked
                          ? [...filters.status, status.value]
                          : filters.status.filter(s => s !== status.value);
                        updateFilters({ status: newStatus });
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${status.color}`} />
                      <span className="text-sm text-gray-300">{status.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <div className="space-y-2">
                {categoryOptions.map((category) => (
                  <label key={category.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category.value)}
                      onChange={(e) => {
                        const newCategory = e.target.checked
                          ? [...filters.category, category.value]
                          : filters.category.filter(c => c !== category.value);
                        updateFilters({ category: newCategory });
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{category.icon}</span>
                      <span className="text-sm text-gray-300">{category.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <div className="space-y-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex space-x-2">
                  <button
                    onClick={() => updateFilters({ sortOrder: 'asc' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      filters.sortOrder === 'asc'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Ascending
                  </button>
                  <button
                    onClick={() => updateFilters({ sortOrder: 'desc' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      filters.sortOrder === 'desc'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    Descending
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-sm text-gray-400">
              Showing {serverCount} server{serverCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => updateFilters({
                search: '',
                status: [],
                category: [],
                sortBy: 'name',
                sortOrder: 'asc',
              })}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface BulkActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function BulkActionButton({ icon, label, onClick, danger }: BulkActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-400/10'
          : 'text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
