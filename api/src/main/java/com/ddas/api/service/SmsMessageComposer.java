package com.ddas.api.service;

import com.ddas.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Builds a real-alert style SMS from an alert and the dam's live values: time, reservoir level,
 * danger level, release and water arrival per zone. Plain ASCII so one SMS holds 160 characters.
 */
@Service
@RequiredArgsConstructor
public class SmsMessageComposer {

    private final JdbcTemplate jdbc;

    public String compose(Long alertId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT a.title, a.message, a.dam_id, t.code, t.name type_name FROM alerts a "
                        + "JOIN alert_types t ON t.id = a.alert_type_id WHERE a.id = ?", alertId);
        if (rows.isEmpty()) throw new ResourceNotFoundException("Alert not found with id: " + alertId);
        Map<String, Object> alert = rows.get(0);
        String code = String.valueOf(alert.get("code"));
        String time = LocalTime.now(ZoneId.of("Asia/Colombo")).format(DateTimeFormatter.ofPattern("HH:mm"));
        String head = String.valueOf(alert.get("type_name")).toUpperCase();

        Long damId = alert.get("dam_id") == null ? null : ((Number) alert.get("dam_id")).longValue();
        if (damId == null) {
            return ascii("[DDAS] " + head + " | " + time + "\n" + alert.get("title") + ". "
                    + (alert.get("message") == null ? "" : alert.get("message")) + " Helpline 117.");
        }

        Map<String, Object> s = jdbc.queryForList(
                "SELECT d.name, s.water_level_meters lvl, s.water_level_percentage pct, s.danger_level_meters danger, "
                        + "s.outflow_cumecs outflow, s.gates_open_count gates FROM dams d "
                        + "LEFT JOIN dam_current_status s ON s.dam_id = d.id WHERE d.id = ?", damId).get(0);
        Double lvl = num(s.get("lvl")), pct = num(s.get("pct")), danger = num(s.get("danger")), outflow = num(s.get("outflow"));

        StringBuilder sb = new StringBuilder("[DDAS] ").append(head).append(" | ").append(s.get("name")).append(" | ").append(time).append('\n');
        String level = lvl == null ? null : String.format("%.1f m", lvl) + (pct == null ? "" : String.format(" (%.0f%% full)", pct));

        if ("ALL_CLEAR".equals(code)) {
            if (level != null) sb.append("Reservoir back to ").append(level);
            if (danger != null && level != null) sb.append(String.format(", below danger level %.1f m", danger));
            sb.append(level != null ? ". " : "").append("Releases stopped. You can return home safely. Take care on damaged roads.");
        } else {
            if (level != null) {
                sb.append("Reservoir ").append(level);
                if (danger != null) sb.append(String.format(lvl >= danger ? ", above danger level %.1f m" : ", danger level %.1f m", danger));
                sb.append(". ");
            }
            if (outflow != null && outflow > 0) {
                sb.append(String.format("Spillway release %,.0f m3/s", outflow));
                if (s.get("gates") != null && ((Number) s.get("gates")).intValue() > 0) sb.append(", ").append(s.get("gates")).append(" gates open");
                sb.append(".");
            }
            String eta = jdbc.queryForList(
                    "SELECT z.zone_name, z.estimated_flood_arrival_minutes eta FROM dam_hazard_zones z "
                            + "JOIN hazard_levels h ON h.id = z.hazard_level_id WHERE z.dam_id = ? AND z.is_active = 1 "
                            + "AND h.evacuation_required = 1 AND z.estimated_flood_arrival_minutes IS NOT NULL ORDER BY h.level_number", damId)
                    .stream().map(z -> zoneLabel(String.valueOf(z.get("zone_name"))) + " ~" + ((Number) z.get("eta")).intValue() + " min")
                    .distinct().collect(Collectors.joining(", "));
            if (!eta.isEmpty()) sb.append("\nWater ETA: ").append(eta).append('.');
            sb.append('\n').append(switch (code) {
                case "EVACUATION_ORDER", "DAM_EMERGENCY" -> "Leave zones L1-L3 now, go to the nearest high ground. Do not cross flooded roads.";
                case "DRILL" -> "This is a drill. No action needed.";
                default -> "Be ready to leave. Keep away from the river.";
            });
        }
        return ascii(sb.append(" Helpline 117.").toString());
    }

    /** "Victoria L1 · Extreme danger (0–3 km)" -> "L1 (0-3 km)" */
    private static String zoneLabel(String name) {
        String[] words = name.split(" · ")[0].split(" ");
        String km = name.contains("(") ? " (" + name.substring(name.lastIndexOf('(') + 1) : "";
        return words[words.length - 1] + km;
    }

    private static Double num(Object v) {
        return v instanceof Number n ? n.doubleValue() : null;
    }

    /** Unicode dashes and dots make the SMS Unicode (70 characters per part): keep it plain. */
    private static String ascii(String text) {
        return text.replace('–', '-').replace('—', '-').replace("·", "|").replace("³", "3").replace("⚠️", "").trim();
    }
}
