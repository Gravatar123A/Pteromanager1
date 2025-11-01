import { useState, useEffect } from 'react';
import { ServerType } from '@/shared/types';

export function useServers() {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const response = await fetch('/api/servers', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch servers: ${response.status}`);
      }

      const data = await response.json();
      setServers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
      console.error('Server fetch error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const controlServer = async (serverId: number, action: string) => {
    try {
      const response = await fetch('/api/servers/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          server_ids: [serverId],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} server: ${response.status}`);
      }

      const result = await response.json();
      
      // Update local state optimistically
      setServers(prev => prev.map(server => {
        if (server.id === serverId) {
          let newStatus = server.status;
          switch (action) {
            case 'start':
              newStatus = 'starting';
              break;
            case 'stop':
              newStatus = 'stopping';
              break;
            case 'restart':
              newStatus = 'stopping';
              break;
          }
          return { ...server, status: newStatus };
        }
        return server;
      }));

      // Refresh servers after a delay to get updated status
      setTimeout(() => {
        fetchServers();
      }, 3000);

      return result;
    } catch (err) {
      console.error(`Server ${action} error:`, err);
      throw err;
    }
  };

  const addServer = async (serverData: { pterodactyl_id: string; name: string; category: string }) => {
    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(serverData),
      });

      if (!response.ok) {
        throw new Error(`Failed to add server: ${response.status}`);
      }

      await fetchServers(); // Refresh the list
      return await response.json();
    } catch (err) {
      console.error('Add server error:', err);
      throw err;
    }
  };

  const deleteServer = async (serverId: number) => {
    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete server: ${response.status}`);
      }

      setServers(prev => prev.filter(server => server.id !== serverId));
      return await response.json();
    } catch (err) {
      console.error('Delete server error:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchServers();
    
    // Set up real-time polling every 30 seconds
    const interval = setInterval(() => {
      fetchServers(false); // Don't show loading spinner for background updates
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    servers,
    loading,
    error,
    fetchServers,
    controlServer,
    addServer,
    deleteServer,
  };
}
