-- ============================================================================
-- DDAS Alerts Module — Seed Data
-- ============================================================================
-- Run AFTER the main schema (ddas_complete_schema.sql) has been applied.
-- These are real production-ready inserts based on actual Sri Lankan dam
-- operations, matching the DB System/alerts_schema.md specification.
--
-- Execution order matters:
--   1. alert_types  (this file)
--   2. alerts       (created via API, not seeded)
-- ============================================================================

-- Prevent duplicate inserts on re-run
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ALERT TYPES
--    Matches: alert_types table
--    Codes align with AlertType entity (code VARCHAR(50) UNIQUE NOT NULL)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO alert_types
    (code, name, name_si, name_ta, category, severity, icon, color,
     requires_acknowledgment, auto_expire_hours, default_channels,
     title_template, title_template_si, body_template, body_template_si,
     is_active, display_order)
VALUES

-- ── Dam-specific alerts ──────────────────────────────────────────────────────
('dam_water_high',
 'High Water Level',
 'ඉහළ ජල මට්ටම',
 'உயர் நீர் மட்டம்',
 'dam', 'warning',
 'water-alert', '#F59E0B',
 FALSE, 48, '["push","sms"]',
 'High Water Level at {dam_name}',
 '{dam_name} හි ඉහළ ජල මට්ටමක්',
 'Water level at {dam_name} has reached {water_level}m ({percentage}% of capacity). Downstream areas should remain on standby.',
 '{dam_name} හි ජල මට්ටම {water_level}m ({percentage}%) ළඟා වී ඇත. පහළ ප්‍රදේශ සූදානම් ව සිටිය යුතුය.',
 TRUE, 1),

('dam_water_critical',
 'Critical Water Level',
 'ආන්තික ජල මට්ටම',
 'நெருக்கடியான நீர் மட்டம்',
 'dam', 'critical',
 'water-alert', '#EF4444',
 TRUE, 24, '["push","sms","email"]',
 'CRITICAL: Water Level at {dam_name}',
 'ශ්‍රේෂ්ඨ: {dam_name} හි ජල මට්ටම',
 'CRITICAL ALERT: Water level at {dam_name} is at {water_level}m ({percentage}%). Immediate preparedness actions required in zones {affected_zones}.',
 'ශ්‍රේෂ්ඨ අනතුරු ඇඟවීම: {dam_name} හි ජල මට්ටම {water_level}m ({percentage}%). කලාප {affected_zones} හි ක්ෂණික සූදානම් ක්‍රියාමාර්ග අවශ්‍ය වේ.',
 TRUE, 2),

('dam_spillway_open',
 'Spillway Gates Opening',
 'වාන් දොරටු විවෘත කිරීම',
 'கோட்டை கதவுகள் திறக்கப்படுகின்றன',
 'dam', 'warning',
 'gate', '#3B82F6',
 FALSE, 24, '["push","sms"]',
 'Spillway Opening at {dam_name}',
 '{dam_name} හි වාන් දොරටු විවෘත කිරීම',
 'Spillway gates at {dam_name} are being opened. Downstream water levels in {region_name} will rise by approximately {expected_rise}m within {eta_hours} hours.',
 '{dam_name} හි වාන් දොරටු විවෘත කෙරේ. {region_name} හි ජල මට්ටම ආසන්නව {expected_rise}m දක්වා ඉහළ යාමට පෙළඹේ.',
 TRUE, 3),

('dam_spillway_close',
 'Spillway Gates Closing',
 'වාන් දොරටු වසා දැමීම',
 'கோட்டை கதவுகள் மூடப்படுகின்றன',
 'dam', 'info',
 'gate-open', '#10B981',
 FALSE, 12, '["push"]',
 'Spillway Closing at {dam_name}',
 '{dam_name} හි වාන් දොරටු වසා දැමීම',
 'Spillway gates at {dam_name} are being closed. Downstream conditions are returning to normal.',
 '{dam_name} හි වාන් දොරටු වසා දැමේ. ජල මට්ටම සාමාන්‍ය තත්ත්වයට පත්වේ.',
 TRUE, 4),

('dam_emergency_release',
 'Emergency Water Release',
 'හදිසි ජල මුදා හැරීම',
 'அவசர நீர் வெளியீடு',
 'dam', 'emergency',
 'waves', '#DC2626',
 TRUE, 12, '["push","sms","email"]',
 'EMERGENCY: Water Release at {dam_name}',
 'හදිසි: {dam_name} හි ජල මුදා හැරීම',
 'EMERGENCY RELEASE at {dam_name}. Controlled emergency discharge in progress. Affected zones: {affected_zones}. Evacuate immediately if in a hazard zone.',
 'හදිසි: {dam_name} හි ජල මුදා හැරීම ආරම්භ විය. ස්ථාන: {affected_zones}. ඔබ අනතුරු කලාපයේ සිටී නම් වහාම ඉවත් වන්න.',
 TRUE, 5),

('dam_structure_alert',
 'Dam Structure Alert',
 'වේල්ල ව්‍යුහ අනතුරු ඇඟවීම',
 'அணை அமைப்பு எச்சரிக்கை',
 'dam', 'emergency',
 'alert-decagram', '#7F1D1D',
 TRUE, 6, '["push","sms","email"]',
 'STRUCTURE ALERT: {dam_name}',
 'ව්‍යුහ අනතුරු ඇඟවීම: {dam_name}',
 'Structural anomaly detected at {dam_name}. Engineering teams are responding. All downstream hazard zones should prepare for evacuation.',
 '{dam_name} හි ව්‍යුහ විෂමතාවයක් හඳුනා ගන්නා ලදී. ඉංජිනේරු කණ්ඩායම් ක්‍රියා ගන්නා අතර, සියලු පහළ කලාප ඉවත් වීමට සූදානම් විය යුතුය.',
 TRUE, 6),

-- ── Flood alerts ─────────────────────────────────────────────────────────────
('flood_watch',
 'Flood Watch',
 'ගංවතුර නිරීක්ෂණය',
 'வெள்ளம் கண்காணிப்பு',
 'flood', 'info',
 'binoculars', '#60A5FA',
 FALSE, 48, '["push"]',
 'Flood Watch: {region_name}',
 'ගංවතුරු නිරීක්ෂණය: {region_name}',
 'Flood conditions are being monitored in {region_name}. Rainfall in the catchment area is above seasonal average. No immediate action required but stay alert.',
 '{region_name} ගංවතුරු තත්ත්වයන් නිරීක්ෂණය කෙරේ. ක්ෂණික ක්‍රියාමාර්ගයක් අවශ්‍ය නොවේ, නමුත් අවධානයෙන් සිටිය යුතුය.',
 TRUE, 10),

('flood_warning',
 'Flood Warning',
 'ගංවතුර අනතුරු ඇඟවීම',
 'வெள்ள எச்சரிக்கை',
 'flood', 'warning',
 'waves', '#F59E0B',
 FALSE, 36, '["push","sms"]',
 'Flood Warning for {region_name}',
 '{region_name} සඳහා ගංවතුර අනතුරු ඇඟවීමක්',
 'Flooding is expected in {region_name} within {eta_hours} hours. Move valuables to higher ground. Be prepared to evacuate if instructed.',
 '{region_name} හි ගංවතුර පැය {eta_hours} ක් ඇතුළත අපේක්ෂිත වේ. වටිනා දේ ඉහළ ස්ථානයකට ගෙනයන්න. ඉල්ලීම් කළ විට ඉවත් වීමට සූදානම් වන්න.',
 TRUE, 11),

('flood_critical',
 'Severe Flood Alert',
 'දරුණු ගංවතුර අනතුර',
 'கடுமையான வெள்ள எச்சரிக்கை',
 'flood', 'critical',
 'waves', '#EF4444',
 TRUE, 24, '["push","sms","email"]',
 'SEVERE FLOOD: {region_name}',
 'දරුණු ගංවතුර: {region_name}',
 'SEVERE FLOODING is occurring or imminent in {region_name}. All low-lying areas must evacuate to designated safe locations immediately.',
 'දරුණු ගංවතුරක් {region_name} හි ක්‍රියාත්මකව ඇත. සියලු පහළ ප්‍රදේශ ක්ෂණිකව ආරක්ෂිත ස්ථාන වෙත ඉවත් විය යුතුය.',
 TRUE, 12),

('flood_emergency',
 'Flash Flood Emergency',
 'හදිසි ගංවතුර හදිසි අවස්ථාව',
 'திடீர் வெள்ள அவசரநிலை',
 'flood', 'emergency',
 'waves-arrow-up', '#991B1B',
 TRUE, 6, '["push","sms","email"]',
 'FLASH FLOOD EMERGENCY: {region_name}',
 'ශීඝ්‍ර ගංවතුර හදිසි: {region_name}',
 'FLASH FLOOD EMERGENCY in {region_name}. Rising waters are life-threatening. EVACUATE IMMEDIATELY. Do not attempt to cross floodwater.',
 'ශීඝ්‍ර ගංවතුර {region_name} හි ක්‍රියාත්මකයි. ජීවිතාපදානමය. ක්ෂණිකව ඉවත් වන්න. ජල ධාරා හරහා ගමන් නොකරන්න.',
 TRUE, 13),

-- ── Weather alerts ───────────────────────────────────────────────────────────
('weather_heavy_rain',
 'Heavy Rainfall Warning',
 'අධික වර්ෂාපතන අනතුරු ඇඟවීම',
 'கனமழை எச்சரிக்கை',
 'weather', 'warning',
 'weather-pouring', '#3B82F6',
 FALSE, 24, '["push"]',
 'Heavy Rain Expected in {region_name}',
 '{region_name} හි අධික වර්ෂාව අපේක්ෂිතයි',
 'Heavy rainfall ({rainfall_mm}mm) is forecast in {region_name} for the next {forecast_hours} hours. Dam and river levels will be monitored closely.',
 '{region_name} හි ඉදිරි පැය {forecast_hours} ක් සඳහා අධික වර්ෂාව ({rainfall_mm}mm) අපේක්ෂිත වේ. ජල මට්ටම් සමීපව නිරීක්ෂණය කෙරේ.',
 TRUE, 20),

('weather_storm',
 'Storm Warning',
 'කුණාටු අනතුරු ඇඟවීම',
 'புயல் எச்சரிக்கை',
 'weather', 'critical',
 'weather-lightning', '#7C3AED',
 FALSE, 24, '["push","sms"]',
 'Storm Warning for {region_name}',
 '{region_name} සඳහා කුණාටු අනතුරු ඇඟවීම',
 'A severe storm system is approaching {region_name}. Expect strong winds, heavy rain, and potential flash flooding. Seek shelter and avoid travel.',
 'දරුණු කුණාටු පද්ධතියක් {region_name} ආසන්නව ඇත. ශක්තිමත් සුළං, ගිගිරි, ශීඝ්‍ර ගංවතුර. ආරක්ෂිත ස්ථාන කරා ළඟා වන්න.',
 TRUE, 21),

('weather_cyclone',
 'Cyclone Warning',
 'සුළිසුළං අනතුරු ඇඟවීම',
 'சுழல் காற்று எச்சரிக்கை',
 'weather', 'emergency',
 'weather-hurricane', '#6D28D9',
 TRUE, 12, '["push","sms","email"]',
 'CYCLONE WARNING: {region_name}',
 'සුළිසුළං අනතුරු: {region_name}',
 'CYCLONE WARNING for {region_name}. Tropical cyclone {storm_name} is approaching. All dams in the region are on high alert. Evacuate coastal and low-lying areas.',
 'සුළිසුළං අනතුරු {region_name}. නිවර්තන කුණාටු {storm_name} ළඟා වෙමින් ඇත. වෙරළ සහ පහළ ප්‍රදේශ ඉවත් කරන්න.',
 TRUE, 22),

-- ── Evacuation alerts ────────────────────────────────────────────────────────
('evacuation_advisory',
 'Evacuation Advisory',
 'ඉවත්වීමේ උපදේශනය',
 'வெளியேற்ற ஆலோசனை',
 'evacuation', 'warning',
 'run', '#F59E0B',
 FALSE, 36, '["push","sms"]',
 'Evacuation Advisory: {zone_name}',
 'ඉවත්වීමේ උපදේශනය: {zone_name}',
 'EVACUATION ADVISORY for {zone_name}. Conditions may require evacuation. Be prepared to leave at short notice. Nearest safe locations: {safe_location_names}.',
 'ඉවත්වීමේ උපදේශනය: {zone_name}. ඉවත් වීම අවශ්‍ය විය හැකිය. ලෝකුළු දැනුම්දීමකට සූදානම් වන්න. ආසන්නම ආරක්ෂිත ස්ථාන: {safe_location_names}.',
 TRUE, 30),

('evacuation_order',
 'Evacuation Order',
 'ඉවත්වීමේ නියෝගය',
 'வெளியேற்ற உத்தரவு',
 'evacuation', 'emergency',
 'run-fast', '#DC2626',
 TRUE, 24, '["push","sms","email"]',
 'EVACUATE NOW: {zone_name}',
 'දැනට ඉවත් වන්න: {zone_name}',
 'MANDATORY EVACUATION ORDER for {zone_name}. You must leave this area immediately. Proceed to {safe_location_names}. Do not delay — this is not a drill.',
 'නිවැරදි ඉවත්වීමේ නියෝගය: {zone_name}. ඔබ ක්ෂණිකව ඉවත් විය යුතුය. {safe_location_names} වෙත ළඟා වන්න. ප්‍රමාද නොවන්න — මෙය පුහුණුවක් නොවේ.',
 TRUE, 31),

('evacuation_all_clear',
 'Evacuation All Clear',
 'ඉවත්වීම නිරවුල් කිරීම',
 'வெளியேற்றம் அனைத்தும் தெளிவு',
 'evacuation', 'info',
 'home-circle', '#10B981',
 FALSE, 12, '["push","sms"]',
 'All Clear: {zone_name}',
 'සියල්ල නිරවුල් (All Clear): {zone_name}',
 'The evacuation advisory for {zone_name} has been LIFTED. It is safe to return. Please check your property for damage before re-entering.',
 '{zone_name} සඳහා ඉවත්වීමේ නියෝගය ඉවත් කර ඇත. ආපසු යාම ආරක්ෂිත වේ. ඇතුළු වීමට පෙර ඔබේ දේපළ පරීක්ෂා කරන්න.',
 TRUE, 32),

-- ── System alerts ─────────────────────────────────────────────────────────────
('system_test',
 'System Test Alert',
 'පද්ධති පරීක්ෂණ අනතුරු ඇඟවීම',
 'கணினி சோதனை எச்சரிக்கை',
 'system', 'info',
 'bell-ring', '#6B7280',
 FALSE, 1, '["push"]',
 'Test Alert — Please Ignore',
 'පරීක්ෂණ — නොසලකන්න',
 'This is a scheduled test of the Dam Disaster Alert System. No action is required. If you have questions, contact your local dam authority.',
 'මෙය DDAS පද්ධතියේ සැලසුම් කළ පරීක්ෂණයකි. කිසිදු ක්‍රියාමාර්ගයක් අවශ්‍ය නොවේ.',
 TRUE, 99),

('system_sensor_offline',
 'Sensor Offline',
 'සංවේදකය නොබැඳී (Offline)',
 'சென்சார் ஆஃப்லைன்',
 'system', 'warning',
 'antenna-off', '#9CA3AF',
 FALSE, 24, '["push"]',
 'Sensor Offline: {sensor_name} at {dam_name}',
 'සංවේදකය නොබැඳී: {sensor_name}',
 'Sensor {sensor_name} at {dam_name} has gone offline. Manual monitoring is in effect until connectivity is restored.',
 '{dam_name} හි {sensor_name} සංවේදකය ක්‍රියාවිරහිත වී ඇත. සබඳතා නැවත ස්ථාපිත වන තෙක් අතින් නිරීක්ෂණය ක්‍රියාත්මකයි.',
 TRUE, 97),

('system_maintenance',
 'Scheduled Maintenance',
 'සැලසුම් කළ නඩත්තු කටයුතු',
 'திட்டமிட்ட பராமரிப்பு',
 'system', 'info',
 'wrench', '#6B7280',
 FALSE, 48, '["push"]',
 'Maintenance: {dam_name} Sensor {sensor_name}',
 'නඩත්තු: {dam_name}',
 'Scheduled maintenance of {sensor_name} at {dam_name} will occur on {date} between {start_time} and {end_time}. Monitoring may be intermittent during this window.',
 '{dam_name} හි {sensor_name} සඳහා නියමිත නඩත්තු {date} ({start_time} - {end_time}) සිදු කෙරේ.',
 TRUE, 98)

ON DUPLICATE KEY UPDATE
    name       = VALUES(name),
    name_si    = VALUES(name_si),
    name_ta    = VALUES(name_ta),
    category   = VALUES(category),
    severity   = VALUES(severity),
    icon       = VALUES(icon),
    color      = VALUES(color),
    requires_acknowledgment = VALUES(requires_acknowledgment),
    auto_expire_hours       = VALUES(auto_expire_hours),
    default_channels        = VALUES(default_channels),
    title_template          = VALUES(title_template),
    title_template_si       = VALUES(title_template_si),
    body_template           = VALUES(body_template),
    body_template_si        = VALUES(body_template_si),
    is_active               = VALUES(is_active),
    display_order           = VALUES(display_order),
    updated_at              = CURRENT_TIMESTAMP;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ALERT PERMISSIONS
--    Idempotent insert — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO permissions (code, name, module, action, description) VALUES
  ('alerts.view',           'View Alerts',          'alerts', 'view',   'Can view alerts and their details'),
  ('alerts.create',         'Create Alerts',        'alerts', 'create', 'Can create new alerts'),
  ('alerts.edit',           'Edit Alerts',          'alerts', 'edit',   'Can edit alert content and status'),
  ('alerts.delete',         'Delete Alerts',        'alerts', 'delete', 'Can delete draft or cancelled alerts'),
  ('alerts.broadcast',      'Broadcast Alerts',     'alerts', 'manage', 'Can broadcast alerts to all users or regions'),
  ('alerts.escalate',       'Escalate Alerts',      'alerts', 'manage', 'Can escalate alert severity'),
  ('alerts.resolve',        'Resolve Alerts',       'alerts', 'manage', 'Can resolve or close active alerts'),
  ('alerts.view_responses', 'View Alert Responses', 'alerts', 'view',   'Can view user acknowledgments and responses'),
  ('alerts.analytics',      'View Alert Analytics', 'alerts', 'view',   'Can access alert analytics dashboard')
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  description = VALUES(description),
  updated_at  = CURRENT_TIMESTAMP;


SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (comment out before production use)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT code, name, category, severity, requires_acknowledgment, display_order
-- FROM alert_types ORDER BY display_order;
--
-- SELECT code, name, module, action FROM permissions WHERE module = 'alerts';
