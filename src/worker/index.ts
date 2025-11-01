import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware, getOAuthRedirectUrl, exchangeCodeForSessionToken, deleteSession, MOCHA_SESSION_TOKEN_COOKIE_NAME } from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { CreateServerSchema, UpdateServerSchema, ServerControlSchema } from "@/shared/types";
import { z } from "zod";
import { checkInactiveServers, executeAutomationActions, getAutomationSummary } from './automation';
import { getGenericPlayerCount } from './player-monitoring';

interface Env {
  DB: D1Database;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  PTERODACTYL_API_URL: string;
  PTERODACTYL_API_KEY: string;
}

interface UserApiConfig {
  pterodactyl_api_url: string;
  pterodactyl_api_key: string;
  pterodactyl_client_key: string | null;
}

const app = new Hono<{ Bindings: Env }>();

// CORS setup
app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  try {
    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Authentication failed" }, 400);
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    try {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// User API configuration routes
app.get("/api/user/api-config", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    const config = await c.env.DB.prepare(
      "SELECT pterodactyl_api_url, pterodactyl_client_key, is_active FROM user_api_configs WHERE user_id = ?"
    ).bind(user.id).first();

    if (!config) {
      return c.json({ 
        pterodactyl_api_url: null, 
        pterodactyl_client_key: null, 
        is_active: false 
      });
    }

    return c.json({
      pterodactyl_api_url: config.pterodactyl_api_url,
      pterodactyl_client_key: config.pterodactyl_client_key,
      is_active: config.is_active
    });
  } catch (error) {
    console.error("API config fetch error:", error);
    return c.json({ error: "Failed to fetch API configuration" }, 500);
  }
});

app.post("/api/user/api-config", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    const body = await c.req.json();
    const { pterodactyl_api_url, pterodactyl_api_key, pterodactyl_client_key } = body;

    if (!pterodactyl_api_url || !pterodactyl_api_key) {
      return c.json({ error: "API URL and API key are required" }, 400);
    }

    // Test the API connection first
    try {
      const testResponse = await fetch(`${pterodactyl_api_url}/api/application/servers`, {
        headers: {
          'Authorization': `Bearer ${pterodactyl_api_key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!testResponse.ok) {
        return c.json({ error: "Failed to connect to Pterodactyl API. Please check your URL and API key." }, 400);
      }
    } catch (testError) {
      return c.json({ error: "Could not reach Pterodactyl API. Please check your URL." }, 400);
    }

    // Save or update configuration
    const existing = await c.env.DB.prepare(
      "SELECT id FROM user_api_configs WHERE user_id = ?"
    ).bind(user.id).first();

    if (existing) {
      await c.env.DB.prepare(
        `UPDATE user_api_configs 
         SET pterodactyl_api_url = ?, pterodactyl_api_key = ?, pterodactyl_client_key = ?, 
             is_active = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ?`
      ).bind(pterodactyl_api_url, pterodactyl_api_key, pterodactyl_client_key || null, user.id).run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO user_api_configs (user_id, pterodactyl_api_url, pterodactyl_api_key, pterodactyl_client_key, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(user.id, pterodactyl_api_url, pterodactyl_api_key, pterodactyl_client_key || null).run();
    }

    return c.json({ message: "API configuration saved successfully" });
  } catch (error) {
    console.error("API config save error:", error);
    return c.json({ error: "Failed to save API configuration" }, 500);
  }
});

// Helper function to get user's API config
async function getUserApiConfig(db: D1Database, userId: string): Promise<UserApiConfig | null> {
  const config = await db.prepare(
    "SELECT pterodactyl_api_url, pterodactyl_api_key, pterodactyl_client_key FROM user_api_configs WHERE user_id = ? AND is_active = TRUE"
  ).bind(userId).first();
  
  return config as UserApiConfig | null;
}

// Pterodactyl API helper functions
async function callPterodactylAPI(endpoint: string, options: RequestInit, apiUrl: string, apiKey: string) {
  const url = `${apiUrl}/api/application${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pterodactyl API error: ${response.status} ${error}`);
  }

  return response.json();
}

async function callPterodactylClientAPI(endpoint: string, options: RequestInit, apiUrl: string, clientKey: string) {
  const url = `${apiUrl}/api/client${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${clientKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pterodactyl Client API error: ${response.status} ${error}`);
  }

  return response.json();
}

// Sync servers from Pterodactyl
app.post("/api/servers/sync", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    const apiConfig = await getUserApiConfig(c.env.DB, user.id);

    if (!apiConfig || !apiConfig.pterodactyl_api_url || !apiConfig.pterodactyl_api_key) {
      return c.json({ error: "Please configure your Pterodactyl API settings first" }, 400);
    }

    // Fetch servers from Pterodactyl
    const pterodactylData = await callPterodactylAPI('/servers', { method: 'GET' }, apiConfig.pterodactyl_api_url, apiConfig.pterodactyl_api_key) as { data?: any[] };
    const pterodactylServers = pterodactylData.data || [];

    let syncedCount = 0;
    let updatedCount = 0;

    for (const serverData of pterodactylServers) {
      const server = serverData.attributes;
      const identifier = server.identifier;
      const name = server.name;
      
      // Determine category based on server name or description
      let category = 'other';
      const nameAndDesc = (name + ' ' + (server.description || '')).toLowerCase();
      if (nameAndDesc.includes('minecraft') || nameAndDesc.includes('mc ')) category = 'minecraft';
      else if (nameAndDesc.includes('gta') || nameAndDesc.includes('fivem')) category = 'gta';
      else if (nameAndDesc.includes('web') || nameAndDesc.includes('site')) category = 'website';
      else if (nameAndDesc.includes('bot') || nameAndDesc.includes('discord')) category = 'discord-bot';
      else if (nameAndDesc.includes('database') || nameAndDesc.includes('db ')) category = 'database';

      // Check if server exists in our database
      const existing = await c.env.DB.prepare(
        "SELECT id FROM servers WHERE pterodactyl_id = ?"
      ).bind(identifier).first();

      if (existing) {
        // Update existing server
        await c.env.DB.prepare(
          `UPDATE servers SET 
           name = ?, status = ?, ram_limit = ?, disk_limit = ?, 
           last_status_check = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE pterodactyl_id = ?`
        ).bind(
          name,
          server.status || 'offline',
          server.limits?.memory || 0,
          server.limits?.disk || 0,
          identifier
        ).run();
        updatedCount++;
      } else {
        // Insert new server
        await c.env.DB.prepare(
          `INSERT INTO servers (pterodactyl_id, name, status, category, ram_limit, disk_limit, last_status_check, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(
          identifier,
          name,
          server.status || 'offline',
          category,
          server.limits?.memory || 0,
          server.limits?.disk || 0
        ).run();
        syncedCount++;
      }
    }

    return c.json({ 
      message: `Sync completed: ${syncedCount} new servers added, ${updatedCount} servers updated`,
      synced: syncedCount,
      updated: updatedCount 
    });
  } catch (error) {
    console.error("Server sync error:", error);
    return c.json({ error: "Failed to sync servers from Pterodactyl" }, 500);
  }
});

// Server management routes
app.get("/api/servers", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    // Get servers from database
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM servers ORDER BY name ASC"
    ).all();

    // Get user's API config for live data
    const apiConfig = await getUserApiConfig(c.env.DB, user.id);
    
    let servers = results;

    // Fetch live resource usage if API is configured
    if (apiConfig && apiConfig.pterodactyl_api_url && apiConfig.pterodactyl_client_key) {
      try {
        // Fetch all client servers with their resources
        const clientServersResponse = await callPterodactylClientAPI('', { method: 'GET' }, apiConfig.pterodactyl_api_url, apiConfig.pterodactyl_client_key) as { data?: any[] };
        const clientData = clientServersResponse.data || [];

        console.log(`Fetched ${clientData.length} servers from Pterodactyl Client API`);

        // Get detailed server info including utilization
        const serverPromises = results.map(async (dbServer: any) => {
          try {
            const liveServer = clientData.find((ls: any) => ls.attributes?.identifier === dbServer.pterodactyl_id);
            
            if (!liveServer) {
              console.log(`No live server data found for ${dbServer.pterodactyl_id}`);
              return { ...dbServer, player_count: 0 };
            }

            const attributes = liveServer.attributes;
            
            // Fetch detailed resources for this specific server
            let resources: any = {};
            let playerCount = 0;
            
            try {
              const resourcesResponse = await callPterodactylClientAPI(
                `/servers/${dbServer.pterodactyl_id}/resources`,
                { method: 'GET' },
                apiConfig.pterodactyl_api_url,
                apiConfig.pterodactyl_client_key || ''
              ) as any;
              
              resources = resourcesResponse?.attributes || {};
              console.log(`Resources for ${dbServer.name}:`, JSON.stringify(resources).substring(0, 200));
              
              // Try to get player count for game servers
              if (['minecraft', 'gta', 'discord-bot'].includes(dbServer.category) && resources.current_state === 'running') {
                // Try to get accurate player counts for game servers
                if (dbServer.category === 'minecraft') {
                  try {
                    const result = await getGenericPlayerCount('minecraft', { resources });
                    playerCount = result.players;
                  } catch (err) {
                    console.log('Could not fetch Minecraft player count:', err);
                  }
                }
                
                // For GTA/FiveM servers
                if (dbServer.category === 'gta') {
                  try {
                    const result = await getGenericPlayerCount('gta', { resources });
                    playerCount = result.players;
                  } catch (err) {
                    console.log('Could not fetch GTA player count:', err);
                  }
                }
                
                // For Discord bots, show "users" instead of players
                if (dbServer.category === 'discord-bot') {
                  try {
                    const result = await getGenericPlayerCount('discord-bot', { resources });
                    playerCount = result.players;
                  } catch (err) {
                    console.log('Could not fetch Discord bot user count:', err);
                  }
                }
              }
            } catch (resourceError) {
              console.error(`Failed to fetch resources for ${dbServer.pterodactyl_id}:`, resourceError);
              // Use the resources from the initial server list if detailed fetch fails
              resources = attributes.resources || {};
            }
            
            return {
              ...dbServer,
              status: resources.current_state || attributes.current_state || dbServer.status,
              cpu_usage: Math.round(resources.cpu_absolute || 0),
              ram_usage: Math.round((resources.memory_bytes || 0) / 1024 / 1024), // Convert to MB
              disk_usage: Math.round((resources.disk_bytes || 0) / 1024 / 1024), // Convert to MB
              network_rx: resources.network_rx_bytes || 0,
              network_tx: resources.network_tx_bytes || 0,
              uptime: resources.uptime || 0,
              player_count: playerCount,
            };
          } catch (serverError) {
            console.error(`Error processing server ${dbServer.pterodactyl_id}:`, serverError);
            return { ...dbServer, player_count: 0 };
          }
        });

        servers = await Promise.all(serverPromises);
        console.log(`Processed ${servers.length} servers with resource data`);
      } catch (error) {
        console.error("Failed to fetch live server data:", error);
        // Continue with database data only
        servers = results;
      }
    }

    return c.json(servers);
  } catch (error) {
    console.error("Server fetch error:", error);
    return c.json({ error: "Failed to fetch servers" }, 500);
  }
});

app.post("/api/servers", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateServerSchema.parse(body);

    const { success } = await c.env.DB.prepare(
      `INSERT INTO servers (pterodactyl_id, name, category, created_at, updated_at) 
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      validatedData.pterodactyl_id,
      validatedData.name,
      validatedData.category
    ).run();

    if (!success) {
      return c.json({ error: "Failed to create server" }, 500);
    }

    return c.json({ message: "Server created successfully" }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid data", details: error.errors }, 400);
    }
    console.error("Server creation error:", error);
    return c.json({ error: "Failed to create server" }, 500);
  }
});

app.put("/api/servers/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const validatedData = UpdateServerSchema.parse(body);

    const setParts = [];
    const values = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const { success } = await c.env.DB.prepare(
      `UPDATE servers SET ${setParts.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    if (!success) {
      return c.json({ error: "Failed to update server" }, 500);
    }

    return c.json({ message: "Server updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid data", details: error.errors }, 400);
    }
    console.error("Server update error:", error);
    return c.json({ error: "Failed to update server" }, 500);
  }
});

app.delete("/api/servers/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const { success } = await c.env.DB.prepare(
      "DELETE FROM servers WHERE id = ?"
    ).bind(id).run();

    if (!success) {
      return c.json({ error: "Failed to delete server" }, 500);
    }

    return c.json({ message: "Server deleted successfully" });
  } catch (error) {
    console.error("Server deletion error:", error);
    return c.json({ error: "Failed to delete server" }, 500);
  }
});

// Server control routes
app.post("/api/servers/control", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    const body = await c.req.json();
    const { action, server_ids } = ServerControlSchema.parse(body);

    const apiConfig = await getUserApiConfig(c.env.DB, user.id);

    if (!apiConfig || !apiConfig.pterodactyl_api_url || !apiConfig.pterodactyl_client_key) {
      return c.json({ error: "Please configure your Pterodactyl API settings first" }, 400);
    }

    const results = [];

    for (const serverId of server_ids) {
      try {
        // Get server details from database
        const server = await c.env.DB.prepare(
          "SELECT * FROM servers WHERE id = ?"
        ).bind(serverId).first() as any;

        if (!server) {
          results.push({ serverId, success: false, error: "Server not found" });
          continue;
        }

        // Map actions to Pterodactyl signals
        let signal = action;
        if (action === 'restart') {
          signal = 'restart';
        } else if (action === 'stop') {
          signal = 'stop';
        } else if (action === 'start') {
          signal = 'start';
        }

        // Call Pterodactyl Client API to control server
        await callPterodactylClientAPI(
          `/servers/${server.pterodactyl_id}/power`,
          {
            method: 'POST',
            body: JSON.stringify({ signal: signal })
          },
          apiConfig.pterodactyl_api_url,
          apiConfig.pterodactyl_client_key
        );

        // Update status in database
        let newStatus = action === 'start' ? 'starting' : 
                       action === 'stop' ? 'stopping' : 
                       action === 'restart' ? 'stopping' : 'offline';

        await c.env.DB.prepare(
          "UPDATE servers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(newStatus, serverId).run();

        // Log the action
        await c.env.DB.prepare(
          `INSERT INTO server_logs (server_id, event_type, message, severity, created_at, updated_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(
          serverId,
          action,
          `Server ${action} initiated`,
          'info'
        ).run();

        results.push({ serverId, success: true });
      } catch (pterodactylError) {
        console.error(`Pterodactyl API error for server ${serverId}:`, pterodactylError);
        results.push({ serverId, success: false, error: "Failed to control server via Pterodactyl API" });
      }
    }

    return c.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid data", details: error.errors }, 400);
    }
    console.error("Server control error:", error);
    return c.json({ error: "Failed to control servers" }, 500);
  }
});

// Bulk server actions
app.post("/api/servers/bulk-action", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { action, category, inactive_only } = body;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return c.json({ error: "Invalid action" }, 400);
    }

    // Build query based on filters
    let query = "SELECT id FROM servers WHERE 1=1";
    const params = [];

    if (category && category !== 'all') {
      query += " AND category = ?";
      params.push(category);
    }

    if (inactive_only) {
      query += " AND status IN ('offline', 'suspended')";
    }

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const serverIds = results.map((r: any) => r.id);

    if (serverIds.length === 0) {
      return c.json({ message: "No servers found matching criteria" });
    }

    // Call the control endpoint directly within this handler
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }

    const apiConfig = await getUserApiConfig(c.env.DB, user.id);

    if (!apiConfig || !apiConfig.pterodactyl_api_url || !apiConfig.pterodactyl_client_key) {
      return c.json({ error: "Please configure your Pterodactyl API settings first" }, 400);
    }

    const results_control = [];

    for (const serverId of serverIds) {
      try {
        // Get server details from database
        const server = await c.env.DB.prepare(
          "SELECT * FROM servers WHERE id = ?"
        ).bind(serverId).first() as any;

        if (!server) {
          results_control.push({ serverId, success: false, error: "Server not found" });
          continue;
        }

        // Map actions to Pterodactyl signals
        let signal = action;

        // Call Pterodactyl Client API to control server
        await callPterodactylClientAPI(
          `/servers/${server.pterodactyl_id}/power`,
          {
            method: 'POST',
            body: JSON.stringify({ signal: signal })
          },
          apiConfig.pterodactyl_api_url,
          apiConfig.pterodactyl_client_key
        );

        // Update status in database
        let newStatus = action === 'start' ? 'starting' : 
                       action === 'stop' ? 'stopping' : 
                       action === 'restart' ? 'stopping' : 'offline';

        await c.env.DB.prepare(
          "UPDATE servers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).bind(newStatus, serverId).run();

        // Log the action
        await c.env.DB.prepare(
          `INSERT INTO server_logs (server_id, event_type, message, severity, created_at, updated_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(
          serverId,
          action,
          `Server ${action} initiated via bulk action`,
          'info'
        ).run();

        results_control.push({ serverId, success: true });
      } catch (pterodactylError) {
        console.error(`Pterodactyl API error for server ${serverId}:`, pterodactylError);
        results_control.push({ serverId, success: false, error: "Failed to control server via Pterodactyl API" });
      }
    }

    return c.json({ results: results_control });
  } catch (error) {
    console.error("Bulk action error:", error);
    return c.json({ error: "Failed to perform bulk action" }, 500);
  }
});

// Server logs routes
app.get("/api/servers/:id/logs", authMiddleware, async (c) => {
  try {
    const serverId = parseInt(c.req.param('id'));
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM server_logs WHERE server_id = ? 
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(serverId, limit, offset).all();

    return c.json(results);
  } catch (error) {
    console.error("Server logs error:", error);
    return c.json({ error: "Failed to fetch server logs" }, 500);
  }
});

// Webhook configuration routes
app.get("/api/webhooks", authMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM webhook_configs ORDER BY name ASC"
    ).all();

    return c.json(results);
  } catch (error) {
    console.error("Webhooks fetch error:", error);
    return c.json({ error: "Failed to fetch webhooks" }, 500);
  }
});

app.post("/api/webhooks", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { name, webhook_url, event_types, is_active = true } = body;

    if (!name || !webhook_url || !event_types) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const { success } = await c.env.DB.prepare(
      `INSERT INTO webhook_configs (name, webhook_url, event_types, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      name,
      webhook_url,
      JSON.stringify(event_types),
      is_active
    ).run();

    if (!success) {
      return c.json({ error: "Failed to create webhook" }, 500);
    }

    return c.json({ message: "Webhook created successfully" }, 201);
  } catch (error) {
    console.error("Webhook creation error:", error);
    return c.json({ error: "Failed to create webhook" }, 500);
  }
});

// Automation endpoint
app.post("/api/servers/automation/check", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user?.id) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const apiConfig = await getUserApiConfig(c.env.DB, user.id);
    if (!apiConfig || !apiConfig.pterodactyl_api_url || !apiConfig.pterodactyl_client_key) {
      return c.json({ error: "Please configure your Pterodactyl API settings first" }, 400);
    }

    // Get all servers
    const { results: servers } = await c.env.DB.prepare(
      "SELECT * FROM servers ORDER BY name ASC"
    ).all();

    // Check for automation actions
    const actions = await checkInactiveServers(servers);

    if (actions.length === 0) {
      return c.json({ message: "No automation actions needed", actions: [] });
    }

    // Execute the actions
    const results = await executeAutomationActions(
      actions,
      servers,
      apiConfig,
      (endpoint: string, options: RequestInit, apiUrl: string, clientKey: string) => 
        callPterodactylClientAPI(endpoint, options, apiUrl, clientKey),
      c.env.DB
    );

    return c.json({
      message: `Automation completed: ${results.success} successful, ${results.failed} failed`,
      ...results
    });
  } catch (error) {
    console.error("Automation check error:", error);
    return c.json({ error: "Failed to run automation check" }, 500);
  }
});

// Automation summary endpoint
app.get("/api/servers/automation/summary", authMiddleware, async (c) => {
  try {
    const { results: servers } = await c.env.DB.prepare(
      "SELECT * FROM servers ORDER BY name ASC"
    ).all();

    const summary = getAutomationSummary(servers);
    return c.json(summary);
  } catch (error) {
    console.error("Automation summary error:", error);
    return c.json({ error: "Failed to get automation summary" }, 500);
  }
});

// Catch all for frontend routing
app.get("*", (c) => {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PteroCTRL - Pterodactyl Management Dashboard</title>
    <meta name="description" content="Modern management dashboard for Pterodactyl panel servers with real-time monitoring, server control, and automation features." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      .glass { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(17, 25, 40, 0.25); border: 1px solid rgba(255, 255, 255, 0.125); }
      .glass-dark { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(17, 25, 40, 0.75); border: 1px solid rgba(255, 255, 255, 0.125); }
      .glass-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
      .glass-hover:hover { backdrop-filter: blur(20px) saturate(200%); -webkit-backdrop-filter: blur(20px) saturate(200%); background-color: rgba(17, 25, 40, 0.4); border: 1px solid rgba(255, 255, 255, 0.2); transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1); }
      .gradient-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .animate-glow { animation: glow 2s ease-in-out infinite alternate; }
      @keyframes glow { from { box-shadow: 0 0 10px #667eea, 0 0 20px #667eea, 0 0 30px #667eea; } to { box-shadow: 0 0 20px #764ba2, 0 0 30px #764ba2, 0 0 40px #764ba2; } }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: rgba(17, 25, 40, 0.3); }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/react-app/main.tsx"></script>
  </body>
</html>`);
});

export default app;
