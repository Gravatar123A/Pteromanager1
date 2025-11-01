
-- Insert sample servers
INSERT INTO servers (pterodactyl_id, name, status, category, cpu_usage, ram_usage, ram_limit, disk_usage, disk_limit, network_rx, network_tx, uptime, last_status_check, is_suspended, created_at, updated_at) VALUES
('srv_mc001', 'SkyBlock Survival', 'online', 'minecraft', 45.5, 2048, 4096, 15360, 51200, 1024000, 512000, 86400, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('srv_web001', 'Portfolio Website', 'online', 'website', 12.3, 512, 1024, 2048, 10240, 256000, 128000, 172800, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('srv_bot001', 'Discord Music Bot', 'offline', 'discord-bot', 0, 0, 512, 1024, 5120, 0, 0, 0, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('srv_gta001', 'FiveM Roleplay', 'starting', 'gta', 78.9, 6144, 8192, 40960, 102400, 2048000, 1024000, 3600, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample logs
INSERT INTO server_logs (server_id, event_type, message, details, severity, created_at, updated_at) VALUES
(1, 'start', 'Server started successfully', 'Server startup completed in 15.3 seconds', 'info', DATETIME('now', '-2 hours'), DATETIME('now', '-2 hours')),
(1, 'backup', 'Automated backup completed', 'Backup saved to /backups/skyblock_2024_10_31.tar.gz', 'info', DATETIME('now', '-1 hour'), DATETIME('now', '-1 hour')),
(2, 'start', 'Website server started', 'Nginx and PHP-FPM started successfully', 'info', DATETIME('now', '-3 hours'), DATETIME('now', '-3 hours')),
(3, 'stop', 'Discord bot stopped', 'Bot shutdown initiated by user', 'info', DATETIME('now', '-30 minutes'), DATETIME('now', '-30 minutes')),
(4, 'restart', 'FiveM server restart', 'Server restarted to apply configuration changes', 'warning', DATETIME('now', '-10 minutes'), DATETIME('now', '-10 minutes'));

-- Insert sample webhook config
INSERT INTO webhook_configs (name, webhook_url, event_types, is_active, created_at, updated_at) VALUES
('Main Discord Channel', 'https://discord.com/api/webhooks/1234567890/example_webhook_url', '["start", "stop", "crash", "error"]', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
