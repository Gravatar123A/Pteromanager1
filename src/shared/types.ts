import { z } from "zod";

export const ServerSchema = z.object({
  id: z.number(),
  pterodactyl_id: z.string(),
  name: z.string(),
  status: z.enum(['online', 'offline', 'starting', 'stopping', 'suspended']),
  category: z.enum(['minecraft', 'gta', 'website', 'discord-bot', 'database', 'other']),
  cpu_usage: z.number().default(0),
  ram_usage: z.number().default(0),
  ram_limit: z.number().default(0),
  disk_usage: z.number().default(0),
  disk_limit: z.number().default(0),
  network_rx: z.number().default(0),
  network_tx: z.number().default(0),
  uptime: z.number().default(0),
  player_count: z.number().optional(),
  last_status_check: z.string().nullable(),
  is_suspended: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ServerType = z.infer<typeof ServerSchema>;

export const ServerLogSchema = z.object({
  id: z.number(),
  server_id: z.number(),
  event_type: z.enum(['start', 'stop', 'restart', 'crash', 'backup', 'error', 'warning', 'info']),
  message: z.string(),
  details: z.string().nullable(),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ServerLogType = z.infer<typeof ServerLogSchema>;

export const WebhookConfigSchema = z.object({
  id: z.number(),
  name: z.string(),
  webhook_url: z.string(),
  is_active: z.boolean(),
  event_types: z.string(), // JSON string of event types array
  created_at: z.string(),
  updated_at: z.string(),
});

export type WebhookConfigType = z.infer<typeof WebhookConfigSchema>;

export const CreateServerSchema = z.object({
  pterodactyl_id: z.string(),
  name: z.string(),
  category: z.enum(['minecraft', 'gta', 'website', 'discord-bot', 'database', 'other']),
});

export const UpdateServerSchema = z.object({
  name: z.string().optional(),
  category: z.enum(['minecraft', 'gta', 'website', 'discord-bot', 'database', 'other']).optional(),
  status: z.enum(['online', 'offline', 'starting', 'stopping', 'suspended']).optional(),
  cpu_usage: z.number().optional(),
  ram_usage: z.number().optional(),
  ram_limit: z.number().optional(),
  disk_usage: z.number().optional(),
  disk_limit: z.number().optional(),
  network_rx: z.number().optional(),
  network_tx: z.number().optional(),
  uptime: z.number().optional(),
  is_suspended: z.boolean().optional(),
});

export const ServerControlSchema = z.object({
  action: z.enum(['start', 'stop', 'restart', 'kill']),
  server_ids: z.array(z.number()),
});
