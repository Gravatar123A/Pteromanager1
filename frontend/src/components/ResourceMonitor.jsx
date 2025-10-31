import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function ResourceMonitor({ resources }) {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className="glass-card p-6 mb-6" data-testid="resource-monitor">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl font-semibold gradient-text">Live Resource Monitor</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((server) => {
          const res = server.resources;
          const cpuUsage = res.cpu_absolute || 0;
          const memoryUsage = res.memory_bytes || 0;
          const memoryLimit = res.memory_limit_bytes || 1;
          const memoryPercent = (memoryUsage / memoryLimit) * 100;
          const diskUsage = res.disk_bytes || 0;

          return (
            <div
              key={server.server_id}
              data-testid={`resource-card-${server.server_id}`}
              className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
            >
              <h3 className="text-sm font-semibold text-slate-300 mb-3 truncate">
                {server.name}
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Cpu className="w-3 h-3" />
                      <span>CPU</span>
                    </div>
                    <span className="text-xs text-slate-300">
                      {cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={cpuUsage}
                    className="h-2"
                    indicatorClassName="bg-gradient-to-r from-cyan-500 to-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MemoryStick className="w-3 h-3" />
                      <span>RAM</span>
                    </div>
                    <span className="text-xs text-slate-300">
                      {(memoryUsage / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  <Progress
                    value={memoryPercent}
                    className="h-2"
                    indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <HardDrive className="w-3 h-3" />
                      <span>Disk</span>
                    </div>
                    <span className="text-xs text-slate-300">
                      {(diskUsage / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  <Progress
                    value={Math.min((diskUsage / (1024 * 1024 * 1024)) * 10, 100)}
                    className="h-2"
                    indicatorClassName="bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}