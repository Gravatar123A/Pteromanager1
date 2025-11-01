
CREATE TABLE servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pterodactyl_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  category TEXT NOT NULL DEFAULT 'other',
  cpu_usage REAL DEFAULT 0,
  ram_usage REAL DEFAULT 0,
  ram_limit REAL DEFAULT 0,
  disk_usage REAL DEFAULT 0,
  disk_limit REAL DEFAULT 0,
  network_rx REAL DEFAULT 0,
  network_tx REAL DEFAULT 0,
  uptime INTEGER DEFAULT 0,
  last_status_check DATETIME,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE server_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  severity TEXT DEFAULT 'info',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhook_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  event_types TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_servers_status ON servers(status);
CREATE INDEX idx_servers_category ON servers(category);
CREATE INDEX idx_server_logs_server_id ON server_logs(server_id);
CREATE INDEX idx_server_logs_event_type ON server_logs(event_type);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(is_active);
