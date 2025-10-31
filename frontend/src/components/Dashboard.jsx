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
import ResourceMonitor from "@/components/ResourceMonitor";
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
    } catch (error) {
      console.error("Failed to fetch resources:", error);
    }
  };

  const controlServer = async (serverId, action) => {
    try {
      await api.post(`/servers/${serverId}/power`, { action });
      toast.success(`Server ${action} command sent`);
      setTimeout(fetchServers, 2000);
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
      setTimeout(fetchServers, 2000);
    } catch (error) {
      toast.error("Bulk action failed");
    }
  };

  const getServerCategory = (server) => {
    const attrs = server.attributes;
    const egg = attrs.egg;
    const nest = attrs.nest;

    if (egg && typeof egg === "object" && egg.name) return egg.name;
    if (nest && typeof nest === "object" && nest.name) return nest.name;
    return "Unknown";
  };

  const getServerResources = (serverId) => {
    return resources.find((r) => r.server_id === serverId)?.resources || null;
  };

  const filteredServers = servers.filter((server) => {
    if (selectedCategory === "all") return true;
    return getServerCategory(server) === selectedCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
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
              Managing {servers.length} server(s)
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

      {/* Resource Monitor */}
      <ResourceMonitor resources={resources} />

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
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredServers.map((server) => {
          const attrs = server.attributes;
          const serverId = attrs.identifier;
          const serverResources = getServerResources(serverId);
          const state = serverResources?.current_state || "unknown";

          return (
            <div
              key={server.id}
              data-testid={`server-card-${serverId}`}
              className="glass-card-hover p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-semibold text-slate-200">
                      {attrs.name}
                    </h3>
                  </div>
                  <Badge
                    className={`status-${state === "running" ? "online" : state === "starting" ? "starting" : "offline"}`}
                  >
                    {state}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Category:</span>
                  <span className="text-cyan-400">
                    {getServerCategory(server)}
                  </span>
                </div>
                {serverResources && (
                  <>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-4 h-4" /> CPU:
                      </span>
                      <span className="text-slate-300">
                        {serverResources.cpu_absolute?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" /> RAM:
                      </span>
                      <span className="text-slate-300">
                        {(
                          (serverResources.memory_bytes || 0) /
                          1024 /
                          1024
                        ).toFixed(0)}{" "}
                        MB
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {state !== "running" && (
                  <Button
                    data-testid={`start-server-${serverId}`}
                    onClick={() => controlServer(serverId, "start")}
                    className="flex-1 btn-success"
                    size="sm"
                  >
                    <Power className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                )}
                {state === "running" && (
                  <Button
                    data-testid={`stop-server-${serverId}`}
                    onClick={() => controlServer(serverId, "stop")}
                    className="flex-1 btn-danger"
                    size="sm"
                  >
                    <PowerOff className="w-4 h-4 mr-1" />
                    Stop
                  </Button>
                )}
                <Button
                  data-testid={`restart-server-${serverId}`}
                  onClick={() => controlServer(serverId, "restart")}
                  className="flex-1 btn-secondary"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Restart
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredServers.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Server className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No servers found</p>
        </div>
      )}
    </div>
  );
}