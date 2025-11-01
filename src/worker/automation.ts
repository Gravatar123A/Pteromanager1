// Server automation utilities for inactive shutdowns and scheduled tasks

interface AutomationRule {
  id: string;
  name: string;
  category: string;
  conditions: {
    inactiveThreshold: number; // minutes
    cpuThreshold: number; // percentage
    playerThreshold: number; // player count
    timeOfDay?: string; // HH:MM format
  };
  actions: {
    shutdown: boolean;
    restart: boolean;
    notification: boolean;
  };
  enabled: boolean;
}

export async function checkInactiveServers(
  servers: any[]
): Promise<{ serverId: number; action: string; reason: string }[]> {
  const actions = [];
  
  // Default automation rules by category
  const automationRules: Record<string, AutomationRule> = {
    'minecraft': {
      id: 'minecraft-auto',
      name: 'Minecraft Auto Shutdown',
      category: 'minecraft',
      conditions: {
        inactiveThreshold: 30, // 30 minutes
        cpuThreshold: 5, // below 5% CPU
        playerThreshold: 0, // no players
      },
      actions: {
        shutdown: true,
        restart: false,
        notification: true,
      },
      enabled: true,
    },
    'gta': {
      id: 'gta-auto',
      name: 'GTA Auto Shutdown',
      category: 'gta',
      conditions: {
        inactiveThreshold: 60, // 1 hour
        cpuThreshold: 10, // below 10% CPU
        playerThreshold: 0, // no players
      },
      actions: {
        shutdown: true,
        restart: false,
        notification: true,
      },
      enabled: true,
    },
    'discord-bot': {
      id: 'bot-restart',
      name: 'Discord Bot Daily Restart',
      category: 'discord-bot',
      conditions: {
        inactiveThreshold: 1440, // 24 hours
        cpuThreshold: 50, // any CPU usage is fine
        playerThreshold: 0, // not applicable
        timeOfDay: '06:00', // restart at 6 AM
      },
      actions: {
        shutdown: false,
        restart: true,
        notification: true,
      },
      enabled: true,
    },
    'website': {
      id: 'website-monitor',
      name: 'Website Monitor',
      category: 'website',
      conditions: {
        inactiveThreshold: 5, // 5 minutes
        cpuThreshold: 1, // very low CPU
        playerThreshold: 0, // not applicable
      },
      actions: {
        shutdown: false,
        restart: true,
        notification: true,
      },
      enabled: true,
    },
    'database': {
      id: 'database-monitor',
      name: 'Database Monitor',
      category: 'database',
      conditions: {
        inactiveThreshold: 10, // 10 minutes
        cpuThreshold: 2, // very low CPU
        playerThreshold: 0, // not applicable
      },
      actions: {
        shutdown: false,
        restart: true,
        notification: false, // databases are critical
      },
      enabled: false, // disabled by default for safety
    },
  };

  const now = new Date();
  
  for (const server of servers) {
    const rule = automationRules[server.category];
    if (!rule || !rule.enabled) continue;

    const lastUpdate = new Date(server.updated_at || server.last_status_check || now);
    const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    let shouldTakeAction = false;
    let actionReason = '';
    let actionType = '';

    // Check inactivity threshold
    if (minutesSinceUpdate >= rule.conditions.inactiveThreshold) {
      // Check CPU threshold
      if (server.cpu_usage <= rule.conditions.cpuThreshold) {
        // Check player threshold (for game servers)
        if (['minecraft', 'gta'].includes(server.category)) {
          if ((server.player_count || 0) <= rule.conditions.playerThreshold) {
            shouldTakeAction = true;
            actionReason = `Inactive for ${Math.round(minutesSinceUpdate)} minutes with ${server.player_count || 0} players`;
          }
        } else {
          shouldTakeAction = true;
          actionReason = `Inactive for ${Math.round(minutesSinceUpdate)} minutes`;
        }
      }
    }

    // Check time-based rules
    if (rule.conditions.timeOfDay) {
      const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
      if (currentTime === rule.conditions.timeOfDay) {
        shouldTakeAction = true;
        actionReason = `Scheduled ${rule.actions.restart ? 'restart' : 'shutdown'} at ${rule.conditions.timeOfDay}`;
      }
    }

    if (shouldTakeAction && server.status === 'online') {
      if (rule.actions.shutdown) {
        actionType = 'stop';
      } else if (rule.actions.restart) {
        actionType = 'restart';
      }

      if (actionType) {
        actions.push({
          serverId: server.id,
          action: actionType,
          reason: actionReason,
        });
      }
    }
  }

  return actions;
}

export async function executeAutomationActions(
  actions: { serverId: number; action: string; reason: string }[],
  servers: any[],
  apiConfig: any,
  callPterodactylClientAPI: Function,
  db: any
): Promise<{ success: number; failed: number; results: any[] }> {
  let success = 0;
  let failed = 0;
  const results = [];

  for (const actionItem of actions) {
    try {
      const server = servers.find(s => s.id === actionItem.serverId);
      if (!server) {
        results.push({ ...actionItem, success: false, error: 'Server not found' });
        failed++;
        continue;
      }

      // Execute the action via Pterodactyl API
      await callPterodactylClientAPI(
        `/servers/${server.pterodactyl_id}/power`,
        {
          method: 'POST',
          body: JSON.stringify({ signal: actionItem.action })
        },
        apiConfig.pterodactyl_api_url,
        apiConfig.pterodactyl_client_key
      );

      // Update database
      const newStatus = actionItem.action === 'stop' ? 'stopping' : 
                       actionItem.action === 'restart' ? 'stopping' : server.status;

      await db.prepare(
        "UPDATE servers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(newStatus, actionItem.serverId).run();

      // Log the automation action
      await db.prepare(
        `INSERT INTO server_logs (server_id, event_type, message, details, severity, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        actionItem.serverId,
        'automation',
        `Automated ${actionItem.action}: ${actionItem.reason}`,
        JSON.stringify(actionItem),
        'info'
      ).run();

      results.push({ ...actionItem, success: true });
      success++;
    } catch (error) {
      console.error(`Automation action failed for server ${actionItem.serverId}:`, error);
      results.push({ ...actionItem, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      failed++;
    }
  }

  return { success, failed, results };
}

export function getAutomationSummary(servers: any[]): Record<string, any> {
  const summary = {
    total: servers.length,
    byCategory: {} as Record<string, any>,
    potentialActions: 0,
  };

  const categories = ['minecraft', 'gta', 'discord-bot', 'website', 'database', 'other'];
  
  categories.forEach(category => {
    const categoryServers = servers.filter(s => s.category === category);
    summary.byCategory[category] = {
      total: categoryServers.length,
      online: categoryServers.filter(s => s.status === 'online').length,
      offline: categoryServers.filter(s => s.status === 'offline').length,
      totalPlayers: categoryServers.reduce((sum, s) => sum + (s.player_count || 0), 0),
      avgCpu: Math.round(categoryServers.reduce((sum, s) => sum + s.cpu_usage, 0) / categoryServers.length) || 0,
    };
  });

  return summary;
}
