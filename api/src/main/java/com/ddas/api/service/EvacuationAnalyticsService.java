package com.ddas.api.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Live evacuation analytics for the command center and the incident report: each person's position,
 * trail and likely shelter, zone clearance with flood countdown, shelter forecast, bottlenecks,
 * stragglers, progress over time and replay frames. Everyone in DDAS is simulated (demo system),
 * so people are shown individually. Reads existing tables only.
 */
@Service
@RequiredArgsConstructor
public class EvacuationAnalyticsService {

    private static final int TRAIL_POINTS = 10;
    private static final double DRIVE_SPEED_MPS = 4.0;     // above this a person is treated as driving
    private static final double BOTTLENECK_CELL_DEG = 0.0015; // ~165 m
    private static final int BOTTLENECK_MIN_PEOPLE = 5;

    private final JdbcTemplate jdbc;
    private final EvacuationRouteService routeService;

    /** One person, as the map and the analytics see them. */
    public record Person(long id, String name, double lat, double lng, String state, String mode, double speedMps,
                         Integer battery, double headingDeg, int stationarySeconds, long secondsSinceUpdate,
                         Long shelterId, String shelterName, Double shelterKm, Integer etaMin,
                         Long zoneId, String zoneName, List<double[]> trail, boolean phone) {
    }

    private record Shelter(long id, String name, double lat, double lng, int capacity, int occupancy, boolean inZone) {
        int free() { return Math.max(0, capacity - occupancy); }
    }

    // ── People ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Person> people() {
        List<EvacuationRouteService.ZoneShape> zones = routeService.currentDangerZones();
        List<Shelter> shelters = shelters(zones);
        List<Map<String, Object>> sessions = jdbc.queryForList(
                "SELECT s.id, u.full_name name, u.email, s.session_type type, s.status, s.last_latitude lat, s.last_longitude lng, " +
                "TIMESTAMPDIFF(SECOND, s.last_update_at, NOW()) age, " +
                "EXISTS (SELECT 1 FROM sos_events e WHERE e.user_id = s.user_id AND e.status IN ('triggered','acknowledged','responding')) sos " +
                "FROM location_sharing_sessions s JOIN users u ON u.id = s.user_id " +
                "WHERE s.share_with_authorities = 1 AND s.last_latitude IS NOT NULL AND (" +
                " (s.status = 'active' AND s.last_update_at > NOW() - INTERVAL 30 MINUTE)" +
                " OR (s.status = 'ended' AND s.ended_at > NOW() - INTERVAL 30 MINUTE))");
        if (sessions.isEmpty()) return List.of();

        // Recent points per session (newest first), for trail, speed, heading and "not moving"
        String ids = sessions.stream().map(s -> String.valueOf(s.get("id"))).collect(Collectors.joining(","));
        Map<Long, List<Map<String, Object>>> points = jdbc.queryForList(
                "SELECT session_id sid, latitude lat, longitude lng, speed_mps speed, battery_level battery FROM location_sharing_updates " +
                "WHERE session_id IN (" + ids + ") AND captured_at > NOW() - INTERVAL 3 MINUTE ORDER BY id DESC")
                .stream().collect(Collectors.groupingBy(r -> ((Number) r.get("sid")).longValue(), LinkedHashMap::new, Collectors.toList()));

        List<Person> out = new ArrayList<>();
        for (Map<String, Object> s : sessions) {
            long id = ((Number) s.get("id")).longValue();
            double lat = num(s.get("lat")), lng = num(s.get("lng"));
            List<Map<String, Object>> recent = points.getOrDefault(id, List.of());
            List<double[]> trail = new ArrayList<>();
            for (int i = Math.min(TRAIL_POINTS, recent.size()) - 1; i >= 0; i--) {
                trail.add(new double[]{num(recent.get(i).get("lng")), num(recent.get(i).get("lat"))});
            }
            double speed = recent.isEmpty() || recent.get(0).get("speed") == null ? 0 : num(recent.get(0).get("speed"));
            Integer battery = recent.isEmpty() || recent.get(0).get("battery") == null ? null : ((Number) recent.get(0).get("battery")).intValue();
            double heading = trail.size() >= 2 ? bearing(trail.get(trail.size() - 2), trail.get(trail.size() - 1)) : 0;
            int stationary = stationarySeconds(recent);

            Optional<EvacuationRouteService.ZoneShape> zone = EvacuationRouteService.zoneAt(zones, lat, lng);
            boolean ended = "ended".equals(s.get("status"));
            boolean sos = truthy(s.get("sos"));
            String state = ended ? "safe" : sos ? "sos" : zone.isPresent() ? "danger" : "moving";
            String mode = speed > DRIVE_SPEED_MPS ? "drive" : "walk";

            // Likely shelter: where they are (if safe) or the nearest usable one; the route API picks among the nearest
            Shelter shelter = shelters.stream().filter(x -> ended || (!x.inZone() && x.free() > 0))
                    .min(Comparator.comparingDouble(x -> GeoPolygons.distanceKm(lat, lng, x.lat(), x.lng()))).orElse(null);
            Double km = shelter == null ? null : round1(GeoPolygons.distanceKm(lat, lng, shelter.lat(), shelter.lng()));
            Integer eta = shelter == null || ended || speed < 0.3 ? null
                    : (int) Math.ceil(km * 1000 / speed / 60);

            out.add(new Person(id, String.valueOf(s.get("name")), lat, lng, state, mode, round1(speed), battery, heading,
                    stationary, ((Number) s.get("age")).longValue(),
                    shelter == null ? null : shelter.id(), shelter == null ? null : shelter.name(), km, eta,
                    zone.map(z -> z.zone().getId()).orElse(null), zone.map(z -> z.zone().getZoneName()).orElse(null), trail,
                    !String.valueOf(s.get("email")).endsWith("@scenario.ddas.local")));   // a real phone, not a simulated resident
        }
        return out;
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> analytics() {
        List<EvacuationRouteService.ZoneShape> zones = routeService.currentDangerZones();
        List<Shelter> shelters = shelters(zones);
        List<Person> people = people();
        List<Person> moving = people.stream().filter(p -> !"safe".equals(p.state())).toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("zones", zoneClearance(zones, people));
        out.put("shelters", shelterForecast(shelters, moving));
        out.put("bottlenecks", bottlenecks(moving));
        out.put("stragglers", stragglers(moving));
        out.put("progress", progress());
        out.put("incident", incident(people, shelters, zones));
        return out;
    }

    private List<Map<String, Object>> zoneClearance(List<EvacuationRouteService.ZoneShape> zones, List<Person> people) {
        // Where each session started (first point in the last 6 h) tells who had to leave each zone
        List<Map<String, Object>> starts = jdbc.queryForList(
                "SELECT u.latitude lat, u.longitude lng FROM location_sharing_updates u JOIN (" +
                " SELECT session_id, MIN(id) mid FROM location_sharing_updates WHERE captured_at > NOW() - INTERVAL 6 HOUR GROUP BY session_id" +
                ") f ON f.mid = u.id");
        Map<Long, LocalDateTime> activeSince = new HashMap<>();
        jdbc.queryForList("SELECT dam_id, last_hazard_assessment_at t FROM dam_current_status WHERE hazard_status <> 'safe'")
                .forEach(r -> activeSince.put(((Number) r.get("dam_id")).longValue(), toTime(r.get("t"))));

        List<Map<String, Object>> out = new ArrayList<>();
        for (EvacuationRouteService.ZoneShape z : zones) {
            long started = starts.stream().filter(p -> z.contains(num(p.get("lat")), num(p.get("lng")))).count();
            long inside = people.stream().filter(p -> !"safe".equals(p.state()) && z.contains(p.lat(), p.lng())).count();
            Integer floodEta = z.zone().getEstimatedFloodArrivalMinutes() != null ? z.zone().getEstimatedFloodArrivalMinutes()
                    : z.zone().getHazardLevel().getEstimatedFloodTimeMinutes();
            LocalDateTime since = activeSince.get(z.zone().getDam().getId());
            Integer minutesLeft = floodEta == null || since == null ? null
                    : (int) (floodEta - Duration.between(since, LocalDateTime.now()).toMinutes());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", z.zone().getId());
            row.put("name", z.zone().getZoneName());
            row.put("damName", z.zone().getDam().getName());
            row.put("level", z.zone().getHazardLevel().getLevelNumber());
            row.put("peopleInside", inside);
            row.put("peopleStarted", Math.max(started, inside));
            row.put("clearedPct", started == 0 ? (inside == 0 ? 100 : 0) : (int) Math.round(100.0 * Math.max(0, started - inside) / started));
            row.put("floodEtaMin", floodEta);
            row.put("floodInMin", minutesLeft);
            row.put("flooded", minutesLeft != null && minutesLeft <= 0);
            row.put("activeSince", since);
            out.add(row);
        }
        out.sort(Comparator.comparing(m -> (Integer) m.get("level")));
        return out;
    }

    private List<Map<String, Object>> shelterForecast(List<Shelter> shelters, List<Person> moving) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Shelter s : shelters) {
            List<Integer> etas = moving.stream().filter(p -> Objects.equals(p.shelterId(), s.id()))
                    .map(p -> p.etaMin() == null ? Integer.MAX_VALUE : p.etaMin()).sorted().toList();
            Integer fullInMin = null;
            if (s.capacity() > 0 && etas.size() >= s.free()) {
                fullInMin = s.free() == 0 ? 0 : etas.get(s.free() - 1) == Integer.MAX_VALUE ? null : etas.get(s.free() - 1);
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", s.id());
            row.put("name", s.name());
            row.put("capacity", s.capacity());
            row.put("occupancy", s.occupancy());
            row.put("incoming", etas.size());
            row.put("fullInMin", fullInMin);
            row.put("willFill", s.capacity() > 0 && etas.size() >= s.free());
            row.put("inZone", s.inZone());
            out.add(row);
        }
        out.sort(Comparator.comparing((Map<String, Object> m) -> (Integer) m.get("incoming")).reversed());
        return out;
    }

    private List<Map<String, Object>> bottlenecks(List<Person> moving) {
        Map<String, double[]> cells = new HashMap<>();   // sumLat, sumLng, count
        for (Person p : moving) {
            if (p.speedMps() < 0.3) continue;
            String key = Math.floor(p.lat() / BOTTLENECK_CELL_DEG) + ":" + Math.floor(p.lng() / BOTTLENECK_CELL_DEG);
            double[] c = cells.computeIfAbsent(key, k -> new double[3]);
            c[0] += p.lat(); c[1] += p.lng(); c[2]++;
        }
        return cells.values().stream().filter(c -> c[2] >= BOTTLENECK_MIN_PEOPLE)
                .map(c -> Map.<String, Object>of("lat", c[0] / c[2], "lng", c[1] / c[2], "count", (int) c[2]))
                .sorted(Comparator.comparing((Map<String, Object> m) -> (Integer) m.get("count")).reversed()).toList();
    }

    private List<Map<String, Object>> stragglers(List<Person> moving) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Person p : moving) {
            List<String> reasons = new ArrayList<>();
            if (p.stationarySeconds() >= 60 && !"sos".equals(p.state())) reasons.add("not moving for " + p.stationarySeconds() / 60 + " min");
            if (p.battery() != null && p.battery() < 20) reasons.add("battery " + p.battery() + "%");
            if (p.secondsSinceUpdate() > 120) reasons.add("no update for " + p.secondsSinceUpdate() / 60 + " min");
            if ("danger".equals(p.state()) && p.shelterKm() != null && p.shelterKm() > 5) reasons.add(p.shelterKm() + " km from a shelter");
            if (!reasons.isEmpty()) {
                out.add(Map.of("id", p.id(), "name", p.name(), "lat", p.lat(), "lng", p.lng(), "state", p.state(),
                        "reasons", reasons, "zoneName", p.zoneName() == null ? "" : p.zoneName()));
            }
        }
        return out;
    }

    /** Per-minute series since the evacuation began: people sharing, and people safe (cumulative). */
    private Map<String, Object> progress() {
        List<Map<String, Object>> sharing = jdbc.queryForList(
                "SELECT DATE_FORMAT(captured_at, '%Y-%m-%d %H:%i:00') m, COUNT(DISTINCT session_id) n FROM location_sharing_updates " +
                "WHERE captured_at > NOW() - INTERVAL 6 HOUR GROUP BY m ORDER BY m");
        List<Map<String, Object>> arrived = jdbc.queryForList(
                "SELECT DATE_FORMAT(ended_at, '%Y-%m-%d %H:%i:00') m, COUNT(*) n FROM location_sharing_sessions " +
                "WHERE status = 'ended' AND ended_at > NOW() - INTERVAL 6 HOUR GROUP BY m ORDER BY m");
        Map<String, Integer> arrivedPerMinute = arrived.stream().collect(Collectors.toMap(
                r -> String.valueOf(r.get("m")), r -> ((Number) r.get("n")).intValue(), (a, b) -> a, TreeMap::new));
        List<Map<String, Object>> series = new ArrayList<>();
        int safe = 0;
        Set<String> minutes = new TreeSet<>();
        sharing.forEach(r -> minutes.add(String.valueOf(r.get("m"))));
        minutes.addAll(arrivedPerMinute.keySet());
        Map<String, Integer> sharingPerMinute = sharing.stream().collect(Collectors.toMap(
                r -> String.valueOf(r.get("m")), r -> ((Number) r.get("n")).intValue()));
        for (String m : minutes) {
            safe += arrivedPerMinute.getOrDefault(m, 0);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("t", m.substring(11, 16));
            point.put("safe", safe);
            point.put("onTheMove", Math.max(0, sharingPerMinute.getOrDefault(m, 0)));
            series.add(point);
        }
        return Map.of("series", series);
    }

    private Map<String, Object> incident(List<Person> people, List<Shelter> shelters, List<EvacuationRouteService.ZoneShape> zones) {
        Map<String, Object> sos = jdbc.queryForMap(
                "SELECT COUNT(*) total, SUM(status = 'resolved') resolved, SUM(status IN ('triggered','acknowledged','responding')) open, " +
                "ROUND(AVG(response_time_seconds)) avgResponse, MAX(response_time_seconds) maxResponse, " +
                "ROUND(AVG(TIMESTAMPDIFF(SECOND, triggered_at, resolved_at))) avgResolve " +
                "FROM sos_events WHERE triggered_at > NOW() - INTERVAL 6 HOUR");
        Map<String, Object> times = jdbc.queryForMap(
                "SELECT MIN(started_at) startedAt, MAX(COALESCE(ended_at, last_update_at)) lastActivity, COUNT(*) total " +
                "FROM location_sharing_sessions WHERE started_at > NOW() - INTERVAL 6 HOUR");
        List<Map<String, Object>> alerts = jdbc.queryForList(
                "SELECT a.id, a.title, a.severity, a.status, a.simulation_mode drill, a.created_at createdAt, d.name damName " +
                "FROM alerts a LEFT JOIN dams d ON d.id = a.dam_id WHERE a.created_at > NOW() - INTERVAL 6 HOUR ORDER BY a.created_at");
        List<Map<String, Object>> blocked = jdbc.queryForList(
                "SELECT name, reason, created_at createdAt FROM blocked_roads WHERE created_at > NOW() - INTERVAL 6 HOUR ORDER BY created_at");

        long safe = people.stream().filter(p -> "safe".equals(p.state())).count();
        long inDanger = people.stream().filter(p -> "danger".equals(p.state()) || "sos".equals(p.state())).count();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("startedAt", times.get("startedAt"));
        out.put("lastActivity", times.get("lastActivity"));
        out.put("peopleTotal", times.get("total"));
        out.put("peopleSafe", safe);
        out.put("peopleInDanger", inDanger);
        out.put("peopleOnTheMove", people.size() - safe - inDanger);
        out.put("zonesActive", zones.size());
        out.put("sos", sos);
        out.put("sheltersUsed", shelters.stream().filter(s -> s.occupancy() > 0).count());
        out.put("shelterCapacity", shelters.stream().mapToInt(Shelter::capacity).sum());
        out.put("shelterOccupancy", shelters.stream().mapToInt(Shelter::occupancy).sum());
        out.put("alerts", alerts);
        out.put("blockedRoads", blocked);
        return out;
    }

    // ── Replay ────────────────────────────────────────────────────────────────

    /** Positions every 15 s over the last {@code minutes}: [{ t, p: [[id, lat, lng, safe], ...] }]. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> replay(int minutes) {
        int window = Math.max(5, Math.min(minutes, 360));
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT u.session_id sid, u.latitude lat, u.longitude lng, FLOOR(UNIX_TIMESTAMP(u.captured_at) / 15) * 15 b, " +
                "(s.ended_at IS NOT NULL AND s.ended_at <= u.captured_at + INTERVAL 15 SECOND) safe " +
                "FROM location_sharing_updates u JOIN location_sharing_sessions s ON s.id = u.session_id " +
                "WHERE u.captured_at > NOW() - INTERVAL " + window + " MINUTE ORDER BY u.id");
        TreeMap<Long, Map<Long, Object[]>> frames = new TreeMap<>();
        for (Map<String, Object> r : rows) {
            long b = ((Number) r.get("b")).longValue();
            frames.computeIfAbsent(b, k -> new LinkedHashMap<>()).put(((Number) r.get("sid")).longValue(),
                    new Object[]{((Number) r.get("sid")).longValue(), round6(num(r.get("lat"))), round6(num(r.get("lng"))), truthy(r.get("safe"))});
        }
        // Carry each person's last position forward so they don't vanish between updates
        Map<Long, Object[]> last = new LinkedHashMap<>();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<Long, Map<Long, Object[]>> f : frames.entrySet()) {
            last.putAll(f.getValue());
            out.add(Map.of("t", f.getKey(), "p", new ArrayList<>(last.values())));
        }
        return out;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<Shelter> shelters(List<EvacuationRouteService.ZoneShape> zones) {
        return jdbc.queryForList("SELECT id, name, latitude lat, longitude lng, COALESCE(capacity_persons,0) cap, COALESCE(current_occupancy,0) occ " +
                        "FROM system_safe_locations WHERE deleted_at IS NULL AND status = 'active' " +
                        "AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(amenities, '$.floodSafety')), '') <> 'unsafe'")
                .stream().map(r -> {
                    double lat = num(r.get("lat")), lng = num(r.get("lng"));
                    return new Shelter(((Number) r.get("id")).longValue(), String.valueOf(r.get("name")), lat, lng,
                            ((Number) r.get("cap")).intValue(), ((Number) r.get("occ")).intValue(),
                            zones.stream().anyMatch(z -> z.contains(lat, lng)));
                }).toList();
    }

    /** Seconds the person has stayed within 15 m, judging from recent points (newest first, ~5 s apart). */
    private static int stationarySeconds(List<Map<String, Object>> recent) {
        if (recent.size() < 2) return 0;
        double lat0 = num(recent.get(0).get("lat")), lng0 = num(recent.get(0).get("lng"));
        int still = 0;
        for (int i = 1; i < recent.size(); i++) {
            if (GeoPolygons.distanceKm(lat0, lng0, num(recent.get(i).get("lat")), num(recent.get(i).get("lng"))) > 0.015) break;
            still++;
        }
        return still * 5;
    }

    private static double bearing(double[] a, double[] b) {
        double y = Math.sin(Math.toRadians(b[0] - a[0])) * Math.cos(Math.toRadians(b[1]));
        double x = Math.cos(Math.toRadians(a[1])) * Math.sin(Math.toRadians(b[1]))
                - Math.sin(Math.toRadians(a[1])) * Math.cos(Math.toRadians(b[1])) * Math.cos(Math.toRadians(b[0] - a[0]));
        return (Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    private static LocalDateTime toTime(Object v) {
        if (v instanceof LocalDateTime t) return t;
        if (v instanceof Timestamp t) return t.toLocalDateTime();
        return null;
    }

    private static boolean truthy(Object v) {
        return v instanceof Boolean b ? b : v instanceof Number n && n.intValue() != 0;
    }

    private static double num(Object v) {
        return v == null ? 0 : ((Number) v).doubleValue();
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static double round6(double v) {
        return Math.round(v * 1e6) / 1e6;
    }
}
