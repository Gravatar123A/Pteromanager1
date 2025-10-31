import { useState, useEffect } from "react";
import { api } from "@/App";
import { toast } from "sonner";
import { Webhook, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function WebhookConfig() {
  const [config, setConfig] = useState({
    webhook_url: "",
    enabled: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get("/webhook");
      if (response.data && response.data.webhook_url) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch webhook config:", error);
    }
  };

  const saveConfig = async () => {
    try {
      await api.post("/webhook", config);
      toast.success("Webhook configuration saved");
    } catch (error) {
      toast.error("Failed to save webhook config");
    }
  };

  return (
    <div className="glass-card p-6" data-testid="webhook-config">
      <div className="flex items-center gap-2 mb-6">
        <Webhook className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-semibold gradient-text">Discord Webhook</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-slate-300">Webhook URL</Label>
          <Input
            data-testid="webhook-url-input"
            value={config.webhook_url}
            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
            className="bg-slate-900/50 border-slate-700 text-slate-200"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
            <Label className="text-slate-300">Enable Webhook</Label>
          </div>
          <Button
            data-testid="save-webhook-button"
            onClick={saveConfig}
            className="btn-primary"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}