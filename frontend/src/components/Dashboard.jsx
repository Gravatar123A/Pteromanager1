import { useState, useEffect } from "react";
import { api } from "@/App";
import { toast } from "sonner";
import {
  Power,
  PowerOff,
  RefreshCw,
  Filter,
  Settings,
  LogOut,
  Server,
  Cpu,
  HardDrive,
  Zap,
  Users,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AutomationPanel from "@/components/AutomationPanel";
import WebhookConfig from "@/components/WebhookConfig";

export default function Dashboard({ onLogout }) {
  const [servers, setServers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [resources, setResources] = useState([]);
  const [totals, setTotals] = useState({
    cpu: 0,
    memory_mb: 0,
    disk_mb: 0,
    players: 0,
    online_servers: 0,
    total_servers: 0,
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchServers();
      fetchResources();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchServers(), fetchCategories(), fetchResources()]);
    setLoading(false);
  };

  const fetchServers = async () => {
    try {
      const response = await api.get("/servers");
      setServers(response.data.servers || []);
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await api.get("/servers/resources");
      setResources(response.data.resources || []);
      setTotals(response.data.totals || {
        cpu: 0,
        memory_mb: 0,
        disk_mb: 0,
        players: 0,
        online_servers: 0,
        total_servers: 0,
      });
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    }
  };

  const controlServer = async (serverId, action) => {
    try {
      await api.post(`/servers/${serverId}/power`, { action });
      toast.success(`Server ${action} command sent`);
      setTimeout(fetchResources, 2000);
    } catch (error) {
      toast.error(`Failed to ${action} server`);
    }
  };

  const bulkAction = async (filterType, action, category = null) => {
    try {
      const response = await api.post("/servers/bulk-action", {
        action,
        filter_type: filterType,
        category,
      });
      toast.success(
        `${action} command sent to ${response.data.count} server(s)`
      );
      setTimeout(fetchResources, 2000);
    } catch (error) {
      toast.error("Bulk action failed");
    }
  };

  const getServerCategory = (server) => {
    return server.egg_name || server.nest_name || "Unknown";
  };

  const getServerResources = (serverId) => {
    return resources.find((r) => r.server_id === serverId) || null;
  };

  const filteredServers = servers.filter((server) => {
    if (selectedCategory === "all") return true;
    return getServerCategory(server) === selectedCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading all servers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Victus Cloud Ptero Manager
            </h1>
            <p className="text-slate-400">
              Managing {totals.total_servers} server(s) • {totals.online_servers} online
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              data-testid="refresh-button"
              onClick={fetchData}
              className="btn-secondary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              data-testid="automation-button"
              onClick={() => setShowAutomation(!showAutomation)}
              className="btn-secondary"
            >
              <Settings className="w-4 h-4 mr-2" />
              Automation
            </Button>
            <Button
              data-testid="webhook-button"
              onClick={() => setShowWebhook(!showWebhook)}
              className="btn-secondary"
            >
              <Zap className="w-4 h-4 mr-2" />
              Webhook
            </Button>
            <Button
              data-testid="logout-button"
              onClick={onLogout}
              className="btn-danger"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Automation Panel */}
      {showAutomation && (
        <div className="mb-6">
          <AutomationPanel categories={categories} />
        </div>
      )}

      {/* Webhook Config */}
      {showWebhook && (
        <div className="mb-6">
          <WebhookConfig />
        </div>
      )}

      {/* Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="glass-card p-4" data-testid="total-players">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="text-slate-400 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-cyan-400">{totals.players}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4" data-testid="total-cpu">
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-slate-400 text-sm">Total CPU</p>
              <p className="text-2xl font-bold text-blue-400">{totals.cpu.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4" data-testid="total-memory">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-slate-400 text-sm">Total RAM</p>
              <p className="text-2xl font-bold text-emerald-400">{(totals.memory_mb / 1024).toFixed(1)} GB</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4" data-testid="total-disk">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-slate-400 text-sm">Total Disk</p>
              <p className="text-2xl font-bold text-purple-400">{(totals.disk_mb / 1024).toFixed(1)} GB</p>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-4" data-testid="online-servers">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-slate-400 text-sm">Online Servers</p>
              <p className="text-2xl font-bold text-green-400">{totals.online_servers}/{totals.total_servers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-cyan-400" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger
                data-testid="category-filter"
                className="w-48 bg-slate-900/50 border-slate-700 text-slate-200"
              >
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">All Categories ({servers.length})</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-slate-400 text-sm">
              Showing {filteredServers.length} servers
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              data-testid="stop-all-button"
              onClick={() => bulkAction("all", "stop")}
              className="btn-danger"
            >
              <PowerOff className="w-4 h-4 mr-2" />
              Stop All
            </Button>
            {selectedCategory !== "all" && (
              <Button
                data-testid="stop-category-button"
                onClick={() =>
                  bulkAction("category", "stop", selectedCategory)
                }
                className="btn-danger"
              >
                Stop {selectedCategory}
              </Button>
            )}
            <Button
              data-testid="stop-inactive-button"
              onClick={() => bulkAction("inactive", "stop")}
              className="btn-secondary"
            >
              Stop Inactive
            </Button>
          </div>
        </div>
      </div>

      {/* Servers List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="text-left p-4 text-slate-300 font-semibold">Server Name</th>
                <th className="text-left p-4 text-slate-300 font-semibold">Category</th>
                <th className="text-left p-4 text-slate-300 font-semibold">Status</th>
                <th className="text-left p-4 text-slate-300 font-semibold">Players</th>
                <th className="text-left p-4 text-slate-300 font-semibold">CPU</th>
                <th className="text-left p-4 text-slate-300 font-semibold">RAM</th>
                <th className="text-left p-4 text-slate-300 font-semibold">Disk</th>
                <th className="text-right p-4 text-slate-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServers.map((server) => {
                const attrs = server.attributes;
                const serverId = attrs.identifier;
                const serverResource = getServerResources(serverId);
                const res = serverResource?.resources || {};
                const state = res.current_state || "offline";
                const players = serverResource?.players || 0;

                return (
                  <tr
                    key={server.id}
                    data-testid={`server-row-${serverId}`}
                    className="border-b border-slate-800 hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-200 font-medium">{attrs.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className="bg-slate-700 text-slate-200 border-slate-600">
                        {getServerCategory(server)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={`status-${state === "running" ? "online" : state === "starting" ? "starting" : "offline"}`}
                      >
                        {state}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Users className="w-4 h-4" />
                        <span>{players}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {(res.cpu_absolute || 0).toFixed(1)}%
                    </td>
                    <td className="p-4 text-slate-300">
                      {((res.memory_bytes || 0) / 1024 / 1024).toFixed(0)} MB
                    </td>
                    <td className="p-4 text-slate-300">
                      {((res.disk_bytes || 0) / 1024 / 1024).toFixed(0)} MB
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        {state !== "running" && (
                          <Button
                            data-testid={`start-server-${serverId}`}
                            onClick={() => controlServer(serverId, "start")}
                            className="btn-success"
                            size="sm"
                          >
                            <Power className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        {state === "running" && (
                          <Button
                            data-testid={`stop-server-${serverId}`}
                            onClick={() => controlServer(serverId, "stop")}
                            className="btn-danger"
                            size="sm"
                          >
                            <PowerOff className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        )}
                        <Button
                          data-testid={`restart-server-${serverId}`}
                          onClick={() => controlServer(serverId, "restart")}
                          className="btn-secondary"
                          size="sm"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Restart
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredServers.length === 0 && (
        <div className="glass-card p-12 text-center mt-6">
          <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No servers found</p>
        </div>
      )}
    </div>
  );
}
