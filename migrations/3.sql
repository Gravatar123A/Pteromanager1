
CREATE TABLE user_api_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  pterodactyl_api_url TEXT,
  pterodactyl_api_key TEXT,
  pterodactyl_client_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_user_api_configs_user_id ON user_api_configs(user_id);
