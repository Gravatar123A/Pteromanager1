import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import Layout from '@/react-app/components/Layout';
import { ArrowLeft, Activity, AlertTriangle, Info, Zap } from 'lucide-react';

interface ServerLog {
  id: number;
  server_id: number;
  event_type: string;
  message: string;
  details: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
  updated_at: string;
}

export default function ServerLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/servers/${id}/logs`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.status}`);
        }

        const data = await response.json();
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [id]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
      case 'critical':
        return 'border-red-500/30 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'info':
        return 'border-blue-500/30 bg-blue-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'start':
        return <Zap className="w-4 h-4 text-green-400" />;
      case 'stop':
        return <Activity className="w-4 h-4 text-red-400" />;
      case 'restart':
        return <Activity className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Server Logs</h1>
            <p className="text-gray-400">Server ID: {id}</p>
          </div>
        </div>

        {/* Logs */}
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
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Error Loading Logs</h3>
              <p className="text-gray-400">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No logs found</h3>
              <p className="text-gray-500">This server doesn't have any logs yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`glass rounded-lg p-4 border ${getSeverityColor(log.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center space-x-2 mt-1">
                      {getEventIcon(log.event_type)}
                      {getSeverityIcon(log.severity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-white capitalize">
                            {log.event_type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            log.severity === 'error' || log.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            log.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {log.severity}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 mb-2">{log.message}</p>
                      
                      {log.details && (
                        <details className="text-sm">
                          <summary className="text-gray-400 cursor-pointer hover:text-white">
                            Show details
                          </summary>
                          <pre className="mt-2 p-3 bg-black/30 rounded-lg text-gray-300 text-xs overflow-x-auto">
                            {log.details}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
