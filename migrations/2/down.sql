
-- Remove sample data
DELETE FROM webhook_configs WHERE name = 'Main Discord Channel';
DELETE FROM server_logs WHERE server_id IN (1, 2, 3, 4);
DELETE FROM servers WHERE pterodactyl_id IN ('srv_mc001', 'srv_web001', 'srv_bot001', 'srv_gta001');
