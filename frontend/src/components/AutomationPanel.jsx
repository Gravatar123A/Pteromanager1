import { useState, useEffect } from "react";
import { api } from "@/App";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AutomationPanel({ categories }) {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rule_type: "category_inactive",
    category: "",
    inactive_minutes: 30,
    enabled: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await api.get("/automation");
      setRules(response.data.rules || []);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    }
  };

  const createRule = async () => {
    try {
      await api.post("/automation", formData);
      toast.success("Automation rule created");
      setShowForm(false);
      setFormData({
        name: "",
        rule_type: "category_inactive",
        category: "",
        inactive_minutes: 30,
        enabled: true,
      });
      fetchRules();
    } catch (error) {
      toast.error("Failed to create rule");
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      await api.delete(`/automation/${ruleId}`);
      toast.success("Rule deleted");
      fetchRules();
    } catch (error) {
      toast.error("Failed to delete rule");
    }
  };

  return (
    <div className="glass-card p-6" data-testid="automation-panel">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-semibold gradient-text">Automation Rules</h2>
        </div>
        <Button
          data-testid="add-rule-button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {showForm && (
        <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-700">
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Rule Name</Label>
              <Input
                data-testid="rule-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Stop idle Minecraft servers"
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            <div>
              <Label className="text-slate-300">Rule Type</Label>
              <Select
                value={formData.rule_type}
                onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
              >
                <SelectTrigger
                  data-testid="rule-type-select"
                  className="bg-slate-800 border-slate-700 text-slate-200"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="category_inactive">Category Inactive</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.rule_type === "category_inactive" && (
              <>
                <div>
                  <Label className="text-slate-300">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger
                      data-testid="rule-category-select"
                      className="bg-slate-800 border-slate-700 text-slate-200"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300">Inactive Minutes</Label>
                  <Input
                    data-testid="rule-inactive-minutes-input"
                    type="number"
                    value={formData.inactive_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, inactive_minutes: parseInt(e.target.value) })
                    }
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label className="text-slate-300">Enabled</Label>
              </div>
              <Button
                data-testid="save-rule-button"
                onClick={createRule}
                className="btn-primary"
                size="sm"
              >
                Save Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            data-testid={`rule-item-${rule.id}`}
            className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-slate-200 font-medium">{rule.name}</h3>
                <p className="text-sm text-slate-400">
                  {rule.rule_type === "category_inactive"
                    ? `Stop ${rule.category} servers after ${rule.inactive_minutes}min inactive`
                    : `Scheduled action`}
                </p>
              </div>
            </div>
            <Button
              data-testid={`delete-rule-${rule.id}`}
              onClick={() => deleteRule(rule.id)}
              className="btn-danger"
              size="sm"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {rules.length === 0 && !showForm && (
        <p className="text-center text-slate-400 py-8">No automation rules yet</p>
      )}
    </div>
  );
}