package com.ddas.api.service;

import com.ddas.api.entity.BlockedRoad;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.BlockedRoadRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Consumer;

/**
 * Response team units for the evacuation command center and the team app (role RESPONDER).
 * A station (police station, hospital, rescue post) has one or more units; each unit is a DDAS account.
 * The operator dispatches units to SOS calls (ranked choice); a busy unit gets the job in its queue and
 * works its jobs one after the other. Live positions, job chat, broadcasts, backup, hand back.
 *
 * Training system: units are DDAS accounts (seed_responders.py); the real services are never contacted.
 * No schema changes: state lives in the existing JSON columns (sos_events.metadata.teams,
 * emergency_service_providers.metadata.responderUserIds / units / inbox) and messages in
 * sos_event_notifications (channel in_app).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private static final List<String> OPEN = List.of("triggered", "acknowledged", "responding");
    /** A unit's job statuses while it is still working on it. */
    private static final List<String> ACTIVE = List.of("assigned", "on_the_way", "arrived");
    private static final long LIVE_MS = 45_000;          // the unit's phone reported in the last 45 s
    private static final int INBOX_MAX = 20;
    private static final double SPEED_KMH = 40;          // straight-line estimate when there is no road time
    private static final int ON_SCENE_MIN = 10;          // expected time on scene, for "free in about…"

    private final JdbcTemplate jdbc;
    private final ValhallaClient valhallaClient;
    private final BlockedRoadRepository blockedRoadRepository;
    private final ObjectMapper objectMapper;

    // ── JSON helpers ───────────────────────────────────────────────────────────

    private ObjectNode json(Object text) {
        try {
            if (text != null) {
                JsonNode n = objectMapper.readTree(String.valueOf(text));
                if (n instanceof ObjectNode o) return o;
            }
        } catch (Exception ignored) {
            // unreadable metadata: start fresh
        }
        return objectMapper.createObjectNode();
    }

    private String text(JsonNode n) {
        try {
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private ObjectNode sosMeta(long sosId) {
        return json(jdbc.queryForList("SELECT metadata FROM sos_events WHERE id = ?", sosId).stream()
                .findFirst().map(r -> r.get("metadata")).orElse(null));
    }

    private void saveSosMeta(long sosId, ObjectNode m) {
        jdbc.update("UPDATE sos_events SET metadata = CAST(? AS JSON) WHERE id = ?", text(m), sosId);
    }

    /** Read the station's metadata fresh, change it, save it (several units share one station). */
    private void updateStation(long stationId, Consumer<ObjectNode> change) {
        ObjectNode m = json(jdbc.queryForList("SELECT metadata FROM emergency_service_providers WHERE id = ?", stationId)
                .stream().findFirst().map(r -> r.get("metadata")).orElse(null));
        change.accept(m);
        jdbc.update("UPDATE emergency_service_providers SET metadata = CAST(? AS JSON) WHERE id = ?", text(m), stationId);
    }

    private static ObjectNode obj(ObjectNode parent, String key) {
        return parent.has(key) && parent.get(key).isObject() ? (ObjectNode) parent.get(key) : parent.putObject(key);
    }

    private static ObjectNode teamsNode(ObjectNode meta) {
        return obj(meta, "teams");
    }

    private static double num(Object v) {
        return v instanceof Number n ? n.doubleValue() : Double.parseDouble(String.valueOf(v));
    }

    private static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    public static String typeLabel(String type) {
        return switch (String.valueOf(type)) {
            case "hospital" -> "Ambulance";
            case "fire_brigade" -> "Fire & rescue";
            case "police" -> "Police";
            default -> "Response team";
        };
    }

    /** 0 = the right kind of unit for this SOS, 1 = can help, 2 = other. */
    private static int typeFit(String sosType, String teamType) {
        String best = switch (String.valueOf(sosType)) {
            case "injured", "medical" -> "hospital";
            case "flood_trapped" -> "fire_brigade";
            default -> "police";
        };
        if (best.equals(teamType)) return 0;
        boolean second = ("flood_trapped".equals(sosType) && "police".equals(teamType))
                || (("injured".equals(sosType) || "medical".equals(sosType)) && "fire_brigade".equals(teamType))
                || ("stranded_vehicle".equals(sosType) && "fire_brigade".equals(teamType));
        return second ? 1 : 2;
    }

    // ── Units and their jobs ───────────────────────────────────────────────────

    private record Unit(long stationId, String station, String type, double sLat, double sLng, long userId, String name, ObjectNode stationMeta) {
        JsonNode state() { return stationMeta.path("units").path(String.valueOf(userId)); }
        boolean live() { return state().path("at").asLong(0) > System.currentTimeMillis() - LIVE_MS; }
        boolean onDuty() { return state().path("onDuty").asBoolean(false); }
        double[] pos() {
            JsonNode s = state();
            return s.has("lat") && s.has("lng") ? new double[]{s.get("lat").asDouble(), s.get("lng").asDouble()} : new double[]{sLat, sLng};
        }
    }

    /** One SOS job of a unit, with its place in the unit's work order. */
    private record Job(long sosId, String status, double lat, double lng, String typeCode, double order) {}

    private List<Unit> units() {
        return jdbc.queryForList(
                "SELECT p.id, p.name, p.service_type type, p.latitude lat, p.longitude lng, p.metadata, u.id uid, u.full_name teamName " +
                "FROM emergency_service_providers p " +
                "JOIN JSON_TABLE(COALESCE(JSON_EXTRACT(p.metadata, '$.responderUserIds'), JSON_ARRAY(JSON_EXTRACT(p.metadata, '$.responderUserId'))), " +
                "  '$[*]' COLUMNS (uid BIGINT PATH '$')) j " +
                "JOIN users u ON u.id = j.uid " +
                "WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL").stream()
                .map(r -> new Unit(((Number) r.get("id")).longValue(), String.valueOf(r.get("name")), String.valueOf(r.get("type")),
                        num(r.get("lat")), num(r.get("lng")), ((Number) r.get("uid")).longValue(), String.valueOf(r.get("teamName")),
                        json(r.get("metadata"))))
                .toList();
    }

    private Unit unit(long userId) {
        return units().stream().filter(u -> u.userId() == userId).findFirst()
                .orElseThrow(() -> new BadRequestException("This account is not a response unit"));
    }

    /** Open SOS calls with their parsed team map. */
    private List<Map<String, Object>> openSos() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT e.id, e.status, e.latitude lat, e.longitude lng, e.metadata, t.code typeCode FROM sos_events e " +
                "JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.status IN ('triggered','acknowledged','responding')");
        rows.forEach(r -> r.put("meta", json(r.remove("metadata"))));
        return rows;
    }

    /** Each unit's jobs in work order: the one already started first, then the queue. */
    private Map<Long, List<Job>> jobsByUnit(List<Map<String, Object>> open) {
        Map<Long, List<Job>> out = new HashMap<>();
        for (Map<String, Object> sos : open) {
            long sosId = ((Number) sos.get("id")).longValue();
            teamsNode((ObjectNode) sos.get("meta")).properties().forEach(e -> {
                String st = e.getValue().path("status").asText("assigned");
                if (!ACTIVE.contains(st)) return;
                out.computeIfAbsent(Long.valueOf(e.getKey()), k -> new ArrayList<>()).add(new Job(sosId, st,
                        num(sos.get("lat")), num(sos.get("lng")), String.valueOf(sos.get("typeCode")),
                        e.getValue().path("order").asDouble(e.getValue().path("assignedAt").asDouble(0))));
            });
        }
        out.values().forEach(list -> list.sort(Comparator
                .comparing((Job j) -> "assigned".equals(j.status()))
                .thenComparingDouble(Job::order)));
        return out;
    }

    private static Map<String, Object> jobRow(Job j, int position) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("sosId", j.sosId());
        m.put("status", j.status());
        m.put("lat", j.lat());
        m.put("lng", j.lng());
        m.put("position", position);   // 0 = current job, 1.. = queue
        return m;
    }

    /** Minutes until the unit could reach (lat, lng) after its jobs (straight-line estimate). */
    private static int minutesAfterJobs(double[] from, List<Job> jobs, double lat, double lng) {
        double min = 0, cLat = from[0], cLng = from[1];
        for (Job j : jobs) {
            min += GeoPolygons.distanceKm(cLat, cLng, j.lat(), j.lng()) / SPEED_KMH * 60 + ON_SCENE_MIN;
            cLat = j.lat();
            cLng = j.lng();
        }
        return (int) Math.ceil(min + GeoPolygons.distanceKm(cLat, cLng, lat, lng) / SPEED_KMH * 60);
    }

    // ── Command center ─────────────────────────────────────────────────────────

    /** Every unit: status, live position, current job and queue. */
    public List<Map<String, Object>> teams() {
        Map<Long, List<Job>> jobs = jobsByUnit(openSos());
        long now = System.currentTimeMillis();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Unit u : units()) {
            List<Job> mine = jobs.getOrDefault(u.userId(), List.of());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("userId", u.userId());
            row.put("stationId", u.stationId());
            row.put("station", u.station());
            row.put("type", u.type());
            row.put("label", typeLabel(u.type()));
            row.put("name", u.name());
            double[] p = u.pos();
            row.put("lat", p[0]);
            row.put("lng", p[1]);
            row.put("live", u.live());
            long at = u.state().path("at").asLong(0);
            row.put("lastSeenSeconds", at == 0 ? null : (now - at) / 1000);
            row.put("battery", u.state().has("battery") ? u.state().get("battery").asInt() : null);
            List<Map<String, Object>> jobRows = new ArrayList<>();
            for (int i = 0; i < mine.size(); i++) jobRows.add(jobRow(mine.get(i), i));
            row.put("jobs", jobRows);
            row.put("mission", jobRows.isEmpty() ? null : jobRows.get(0));
            row.put("queued", Math.max(0, mine.size() - 1));
            row.put("status", !mine.isEmpty() ? mine.get(0).status() : u.onDuty() ? "available" : "off_duty");
            out.add(row);
        }
        out.sort(Comparator.comparing((Map<String, Object> r) -> String.valueOf(r.get("type")))
                .thenComparing(r -> String.valueOf(r.get("name"))));
        return out;
    }

    /** Units ranked for one SOS: right kind first, free before busy, then road time (busy: time after their jobs). */
    public List<Map<String, Object>> recommend(long sosId) {
        Map<String, Object> sos = jdbc.queryForList(
                "SELECT e.latitude lat, e.longitude lng, e.metadata, t.code typeCode FROM sos_events e " +
                "JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.id = ?", sosId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("SOS not found: " + sosId));
        double lat = num(sos.get("lat")), lng = num(sos.get("lng"));
        String sosType = String.valueOf(sos.get("typeCode"));
        ObjectNode onThis = teamsNode(json(sos.get("metadata")));
        Map<Long, List<Job>> jobs = jobsByUnit(openSos());

        List<Map<String, Object>> list = new ArrayList<>(teams());
        for (Map<String, Object> t : list) {
            long uid = ((Number) t.get("userId")).longValue();
            List<Job> mine = jobs.getOrDefault(uid, List.of());
            double[] from = {num(t.get("lat")), num(t.get("lng"))};
            t.put("fit", typeFit(sosType, String.valueOf(t.get("type"))));
            t.put("busy", !mine.isEmpty());
            t.put("onThisSos", ACTIVE.contains(onThis.path(String.valueOf(uid)).path("status").asText("")));
            t.put("km", round1(GeoPolygons.distanceKm(lat, lng, from[0], from[1])));
            t.put("etaMin", minutesAfterJobs(from, mine, lat, lng));
            t.put("roadEta", false);
        }
        Comparator<Map<String, Object>> rank = Comparator
                .comparing((Map<String, Object> t) -> (Boolean) t.get("onThisSos"))
                .thenComparing(t -> (Integer) t.get("fit"))
                .thenComparing(t -> (Boolean) t.get("busy"));
        list.sort(rank.thenComparing(t -> (Integer) t.get("etaMin")));
        // Road time (Valhalla) for the 8 most likely free units
        List<List<double[]>> avoid = blockedAreas(lat, lng);
        int routed = 0;
        for (Map<String, Object> t : list) {
            if ((Boolean) t.get("busy") || (Boolean) t.get("onThisSos") || routed >= 8) continue;
            routed++;
            valhallaClient.route(num(t.get("lat")), num(t.get("lng")), lat, lng, "auto", avoid).ifPresent(r -> {
                t.put("etaMin", (int) Math.ceil(r.timeMinutes()));
                t.put("km", round1(r.distanceKm()));
                t.put("roadEta", true);
            });
        }
        list.sort(rank.thenComparing(t -> (Integer) t.get("etaMin")));
        // Recommended: the best free unit; if every unit is busy, the one that can get there soonest
        list.stream().filter(t -> !(Boolean) t.get("onThisSos") && !(Boolean) t.get("busy")).findFirst()
                .or(() -> list.stream().filter(t -> !(Boolean) t.get("onThisSos")).min(Comparator.comparing(t -> (Integer) t.get("etaMin"))))
                .ifPresent(t -> t.put("recommended", true));
        return list;
    }

    /** Dispatch by unit (teamUserId) or by station (stationId: its unit with the shortest queue). */
    @Transactional
    public Map<String, Object> dispatch(long sosId, Long teamUserId, Long stationId) {
        Map<Long, List<Job>> jobs = jobsByUnit(openSos());
        Unit u;
        if (teamUserId != null) {
            u = unit(teamUserId);
        } else if (stationId != null) {
            u = units().stream().filter(x -> x.stationId() == stationId)
                    .min(Comparator.comparingInt(x -> jobs.getOrDefault(x.userId(), List.of()).size()))
                    .orElseThrow(() -> new BadRequestException("This station has no response unit"));
        } else {
            throw new BadRequestException("Choose a unit");
        }
        ObjectNode meta = sosMeta(sosId);
        ObjectNode teams = teamsNode(meta);
        String key = String.valueOf(u.userId());
        if (ACTIVE.contains(teams.path(key).path("status").asText(""))) {
            throw new BadRequestException(u.name() + " is already on this SOS");
        }
        long now = System.currentTimeMillis();
        ObjectNode t = teams.putObject(key);
        t.put("stationId", u.stationId());
        t.put("station", u.station());
        t.put("name", u.name());
        t.put("type", u.type());
        t.put("status", "assigned");
        t.put("assignedAt", now);
        t.put("order", now);
        double[] p = u.pos();
        t.put("lat", p[0]);
        t.put("lng", p[1]);
        boolean first = !meta.has("assignedProviderName");
        if (first) {
            meta.put("assignedProviderId", u.stationId());
            meta.put("assignedProviderName", u.station());
        }
        int queuePos = jobs.getOrDefault(u.userId(), List.of()).size();   // 0 = starts now
        String note = u.name() + " dispatched";
        int n = jdbc.update("UPDATE sos_events SET status = 'responding', responding_at = COALESCE(responding_at, NOW()), " +
                "acknowledged_at = COALESCE(acknowledged_at, NOW()), " +
                "response_time_seconds = COALESCE(response_time_seconds, TIMESTAMPDIFF(SECOND, triggered_at, NOW())), " +
                "assigned_responder_id = COALESCE(assigned_responder_id, ?), " +
                "response_notes = CASE WHEN response_notes IS NULL OR ? THEN ? ELSE CONCAT(response_notes, '; ', ?) END " +
                "WHERE id = ? AND status IN ('triggered','acknowledged','responding')",
                u.userId(), first, note, note, sosId);
        if (n == 0) throw new BadRequestException("SOS " + sosId + " not found or already closed");
        saveSosMeta(sosId, meta);
        message(sosId, "system", null, "Control room",
                note + (queuePos == 0 ? ". Job sent to the unit." : ". Added to its queue as job " + (queuePos + 1) + "."), false);
        return Map.of("unit", u.name(), "queuePosition", queuePos);
    }

    /** Dispatch by station (the station's unit with the shortest queue). */
    public void dispatch(long sosId, long stationId) {
        dispatch(sosId, null, stationId);
    }

    /** The control room takes a job back from a unit (to give it to another one). */
    @Transactional
    public void unassign(long sosId, long teamUserId) {
        String name = removeFromSos(sosId, teamUserId);
        appendInbox(unit(teamUserId).stationId(), "Control room", "SOS #" + sosId + " was taken back from " + name + ".", name);
        message(sosId, "system", null, "Control room", name + " taken off this SOS.", false);
    }

    /** The unit hands a job back (cannot reach, wrong kind of help…). */
    @Transactional
    public void handBack(long teamUserId, long sosId, String reason) {
        String name = removeFromSos(sosId, teamUserId);
        message(sosId, "team", teamUserId, name, "⚠ Handed back" + (reason == null || reason.isBlank() ? "" : ": " + reason), false);
    }

    private String removeFromSos(long sosId, long teamUserId) {
        ObjectNode meta = sosMeta(sosId);
        ObjectNode teams = teamsNode(meta);
        JsonNode mine = teams.get(String.valueOf(teamUserId));
        if (mine == null) throw new ResourceNotFoundException("This unit is not on SOS " + sosId);
        String name = mine.path("name").asText("Unit");
        teams.remove(String.valueOf(teamUserId));
        saveSosMeta(sosId, meta);
        boolean anyLeft = teams.properties().stream().anyMatch(e -> ACTIVE.contains(e.getValue().path("status").asText()));
        if (!anyLeft) {
            // Nobody is coming any more: back to the operator
            jdbc.update("UPDATE sos_events SET status = 'acknowledged', assigned_responder_id = NULL " +
                    "WHERE id = ? AND status IN ('triggered','acknowledged','responding')", sosId);
        } else {
            jdbc.update("UPDATE sos_events SET assigned_responder_id = NULL WHERE id = ? AND assigned_responder_id = ?", sosId, teamUserId);
        }
        return name;
    }

    /** Move a job that has not started up or down in a unit's queue. */
    @Transactional
    public void move(long teamUserId, long sosId, String direction) {
        List<Job> queue = jobsByUnit(openSos()).getOrDefault(teamUserId, List.of()).stream()
                .filter(j -> "assigned".equals(j.status())).toList();
        int i = -1;
        for (int k = 0; k < queue.size(); k++) if (queue.get(k).sosId() == sosId) i = k;
        if (i < 0) throw new BadRequestException("Only jobs that have not started can be moved");
        int other = "up".equals(direction) ? i - 1 : i + 1;
        if (other < 0 || other >= queue.size()) return;
        Job a = queue.get(i), b = queue.get(other);
        setOrder(a.sosId(), teamUserId, b.order());
        setOrder(b.sosId(), teamUserId, a.order());
    }

    private void setOrder(long sosId, long teamUserId, double order) {
        ObjectNode meta = sosMeta(sosId);
        if (teamsNode(meta).get(String.valueOf(teamUserId)) instanceof ObjectNode o) {
            o.put("order", order);
            saveSosMeta(sosId, meta);
        }
    }

    // ── The unit's app ─────────────────────────────────────────────────────────

    public Map<String, Object> me(long userId) {
        Unit u = unit(userId);
        Map<String, Object> st = new LinkedHashMap<>();
        st.put("id", u.stationId());
        st.put("name", u.station());
        st.put("type", u.type());
        st.put("label", typeLabel(u.type()));
        st.put("lat", u.sLat());
        st.put("lng", u.sLng());
        return Map.of("station", st, "unit", u.name(), "onDuty", u.onDuty());
    }

    /** The unit's jobs: current first, then the queue in order, then the ones closed in the last 6 hours. */
    public List<Map<String, Object>> missions(long userId) {
        String key = String.valueOf(userId);
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT e.id, e.status, t.code typeCode, t.name type, e.custom_message message, e.battery_level battery, " +
                "e.triggered_at triggeredAt, e.resolved_at resolvedAt, u.full_name person, d.name damName, e.metadata, " +
                "COALESCE(s.last_latitude, e.latitude) lat, COALESCE(s.last_longitude, e.longitude) lng, " +
                "TIMESTAMPDIFF(SECOND, COALESCE(s.last_update_at, e.triggered_at), NOW()) positionAgeSeconds, " +
                "e.resolution_notes resolutionNotes " +
                "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id JOIN users u ON u.id = e.user_id " +
                "LEFT JOIN dams d ON d.id = e.dam_id " +
                "LEFT JOIN location_sharing_sessions s ON s.id = (SELECT MAX(id) FROM location_sharing_sessions " +
                "  WHERE user_id = e.user_id AND status = 'active') " +
                "WHERE JSON_CONTAINS_PATH(e.metadata, 'one', CONCAT('$.teams.\"', ?, '\"')) " +
                "  AND (e.status IN ('triggered','acknowledged','responding') OR e.resolved_at > NOW() - INTERVAL 6 HOUR)", key);
        List<Job> order = jobsByUnit(openSos()).getOrDefault(userId, List.of());
        for (Map<String, Object> r : rows) {
            ObjectNode meta = json(r.remove("metadata"));
            String st = teamsNode(meta).path(key).path("status").asText("assigned");
            long id = ((Number) r.get("id")).longValue();
            int pos = -1;
            for (int i = 0; i < order.size(); i++) if (order.get(i).sosId() == id) pos = i;
            boolean open = OPEN.contains(String.valueOf(r.get("status")));
            r.put("teamStatus", open && ACTIVE.contains(st) ? st : "rescued".equals(st) ? "rescued" : "done");
            r.put("queuePosition", pos);           // 0 = current job, 1.. = queue, -1 = closed
            r.put("otherTeams", teamList(meta, key));
            r.put("backupRequested", meta.path("backupRequested").asBoolean(false));
        }
        rows.sort(Comparator.comparingInt((Map<String, Object> r) -> {
            int p = (Integer) r.get("queuePosition");
            return p < 0 ? 1000 : p;
        }));
        return rows;
    }

    /** accept | arrived | resolve | backup | handback */
    @Transactional
    public void act(long userId, long sosId, String action, String notes) {
        if ("handback".equals(action)) {
            handBack(userId, sosId, notes);
            return;
        }
        ObjectNode meta = sosMeta(sosId);
        if (!(teamsNode(meta).get(String.valueOf(userId)) instanceof ObjectNode me)) {
            throw new ResourceNotFoundException("Job " + sosId + " is not assigned to this unit");
        }
        String status = jdbc.queryForObject("SELECT status FROM sos_events WHERE id = ?", String.class, sosId);
        if (!OPEN.contains(status)) throw new BadRequestException("Job " + sosId + " is already closed");
        String name = me.path("name").asText("Unit");
        switch (action) {
            case "accept" -> {
                // One job at a time: finish the current one first
                boolean busyElsewhere = jobsByUnit(openSos()).getOrDefault(userId, List.of()).stream()
                        .anyMatch(j -> j.sosId() != sosId && !"assigned".equals(j.status()));
                if (busyElsewhere) throw new BadRequestException("Finish your current job first");
                me.put("status", "on_the_way");
                me.put("acceptedAt", System.currentTimeMillis());
            }
            case "arrived" -> { me.put("status", "arrived"); me.put("arrivedAt", System.currentTimeMillis()); }
            case "backup" -> {
                meta.put("backupRequested", true);
                meta.put("backupBy", name);
                saveSosMeta(sosId, meta);
                message(sosId, "team", userId, name, "⚠ Backup requested" + (notes == null || notes.isBlank() ? "" : ": " + notes), false);
                return;
            }
            case "resolve" -> {
                me.put("status", "rescued");
                teamsNode(meta).properties().forEach(e -> {
                    if (ACTIVE.contains(e.getValue().path("status").asText())) ((ObjectNode) e.getValue()).put("status", "done");
                });
                saveSosMeta(sosId, meta);
                jdbc.update("UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, resolution_notes = ? WHERE id = ?",
                        userId, notes == null || notes.isBlank() ? "Rescued by " + name : notes, sosId);
                message(sosId, "team", userId, name, "Person rescued. Job closed.", true);
                return;
            }
            default -> throw new BadRequestException("Unknown action: " + action);
        }
        saveSosMeta(sosId, meta);
        message(sosId, "team", userId, name, "accept".equals(action) ? "On our way." : "Arrived at the person.", true);
    }

    /** The unit's phone position (every few seconds while on duty). */
    @Transactional
    public void location(long userId, double lat, double lng, Integer battery) {
        Unit u = unit(userId);
        updateStation(u.stationId(), m -> {
            ObjectNode s = obj(obj(m, "units"), String.valueOf(userId));
            s.put("lat", lat);
            s.put("lng", lng);
            s.put("at", System.currentTimeMillis());
            s.put("onDuty", true);
            if (battery != null) s.put("battery", battery);
        });
        String key = String.valueOf(userId);
        for (Map<String, Object> sos : openSos()) {
            ObjectNode meta = (ObjectNode) sos.get("meta");
            if (teamsNode(meta).get(key) instanceof ObjectNode o && ACTIVE.contains(o.path("status").asText())) {
                o.put("lat", lat);
                o.put("lng", lng);
                o.put("at", System.currentTimeMillis());
                saveSosMeta(((Number) sos.get("id")).longValue(), meta);
            }
        }
    }

    public void duty(long userId, boolean onDuty) {
        Unit u = unit(userId);
        updateStation(u.stationId(), m -> obj(obj(m, "units"), String.valueOf(userId)).put("onDuty", onDuty));
    }

    // ── Messages ───────────────────────────────────────────────────────────────

    /** One message in a job's channel (sos_event_notifications, channel in_app). */
    public void message(long sosId, String from, Long fromUserId, String fromName, String text, boolean toPerson) {
        if (text == null || text.isBlank()) throw new BadRequestException("Write a message first");
        ObjectNode info = objectMapper.createObjectNode();
        info.put("from", from);
        if (fromUserId != null) info.put("fromUserId", fromUserId);
        info.put("fromName", fromName);
        info.put("toPerson", toPerson);
        jdbc.update("INSERT INTO sos_event_notifications (uuid, sos_event_id, recipient_type, recipient_name, channel, priority, " +
                        "status, sent_at, provider, provider_response, message_content) " +
                        "VALUES (?, ?, 'authority_user', ?, 'in_app', 'high', 'sent', NOW(), 'ddas-in-app', CAST(? AS JSON), ?)",
                UUID.randomUUID().toString(), sosId, "team".equals(from) ? "Control room" : "Response units", text(info),
                text.length() > 1000 ? text.substring(0, 1000) : text);
    }

    public List<Map<String, Object>> messages(long sosId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, queued_at at, message_content text, provider_response info FROM sos_event_notifications " +
                "WHERE sos_event_id = ? AND channel = 'in_app' ORDER BY id", sosId);
        rows.forEach(r -> {
            JsonNode info = json(r.remove("info"));
            r.put("from", info.path("from").asText("control"));
            r.put("fromName", info.path("fromName").asText(""));
            r.put("fromUserId", info.has("fromUserId") ? info.get("fromUserId").asLong() : null);
            r.put("toPerson", info.path("toPerson").asBoolean(false));
        });
        return rows;
    }

    private void appendInbox(long stationId, String fromName, String text, String to) {
        updateStation(stationId, m -> {
            ArrayNode inbox = m.has("inbox") && m.get("inbox").isArray() ? (ArrayNode) m.get("inbox") : m.putArray("inbox");
            ObjectNode msg = inbox.addObject();
            msg.put("id", System.nanoTime());
            msg.put("at", System.currentTimeMillis());
            msg.put("fromName", fromName);
            msg.put("text", text);
            msg.put("to", to);
            while (inbox.size() > INBOX_MAX) inbox.remove(0);
        });
    }

    /** Broadcast to every unit, or to one kind (police / hospital / fire_brigade). Returns the number of units. */
    @Transactional
    public int broadcast(String text, String type, String fromName) {
        if (text == null || text.isBlank()) throw new BadRequestException("Write a message first");
        Set<Long> stations = new LinkedHashSet<>();
        int count = 0;
        for (Unit u : units()) {
            if (type != null && !type.isBlank() && !type.equals(u.type())) continue;
            stations.add(u.stationId());
            count++;
        }
        String to = type == null || type.isBlank() ? "All units" : typeLabel(type) + " units";
        stations.forEach(s -> appendInbox(s, fromName, text, to));
        return count;
    }

    /** The unit's inbox: broadcasts and notices to its station, plus control-room messages on its jobs, newest first. */
    public List<Map<String, Object>> inbox(long userId) {
        Unit u = unit(userId);
        List<Map<String, Object>> out = new ArrayList<>();
        if (u.stationMeta().get("inbox") instanceof ArrayNode inbox) {
            inbox.forEach(m -> out.add(new LinkedHashMap<>(Map.of(
                    "key", "b" + m.path("id").asLong(), "kind", "broadcast", "atMs", m.path("at").asLong(),
                    "fromName", m.path("fromName").asText(""), "text", m.path("text").asText(""), "to", m.path("to").asText("")))));
        }
        for (Map<String, Object> m : jdbc.queryForList(
                "SELECT n.id, n.sos_event_id sosId, UNIX_TIMESTAMP(n.queued_at) * 1000 atMs, n.message_content text, n.provider_response info " +
                "FROM sos_event_notifications n JOIN sos_events e ON e.id = n.sos_event_id " +
                "WHERE n.channel = 'in_app' AND JSON_CONTAINS_PATH(e.metadata, 'one', CONCAT('$.teams.\"', ?, '\"')) " +
                "AND n.queued_at > NOW() - INTERVAL 12 HOUR ORDER BY n.id DESC LIMIT 50", String.valueOf(userId))) {
            JsonNode info = json(m.get("info"));
            if (!"control".equals(info.path("from").asText())) continue;
            out.add(new LinkedHashMap<>(Map.of("key", "m" + m.get("id"), "kind", "mission", "sosId", m.get("sosId"),
                    "atMs", ((Number) m.get("atMs")).longValue(), "fromName", info.path("fromName").asText("Control room"),
                    "text", String.valueOf(m.get("text")))));
        }
        out.sort(Comparator.comparing((Map<String, Object> m) -> ((Number) m.get("atMs")).longValue()).reversed());
        return out;
    }

    // ── For the person who called, and for the map ─────────────────────────────

    /** Units on an SOS as a list (name, kind, status, position). */
    public List<Map<String, Object>> teamList(ObjectNode meta, String exceptKey) {
        List<Map<String, Object>> out = new ArrayList<>();
        teamsNode(meta).properties().forEach(e -> {
            if (e.getKey().equals(exceptKey)) return;
            JsonNode t = e.getValue();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", Long.valueOf(e.getKey()));
            m.put("name", t.path("name").asText());
            m.put("station", t.path("station").asText());
            m.put("type", t.path("type").asText());
            m.put("label", typeLabel(t.path("type").asText()));
            m.put("status", t.path("status").asText("assigned"));
            m.put("lat", t.has("lat") ? t.get("lat").asDouble() : null);
            m.put("lng", t.has("lng") ? t.get("lng").asDouble() : null);
            out.add(m);
        });
        return out;
    }

    public List<Map<String, Object>> teamList(Object metadata) {
        return teamList(json(metadata), null);
    }

    public boolean backupRequested(Object metadata) {
        return json(metadata).path("backupRequested").asBoolean(false);
    }

    /** Units coming to the person: road distance and time for one on the way, an estimate after its jobs otherwise. */
    public List<Map<String, Object>> comingTo(long sosId, double lat, double lng) {
        List<Map<String, Object>> teams = teamList(sosMeta(sosId), null);
        Map<Long, List<Job>> jobs = jobsByUnit(openSos());
        for (Map<String, Object> t : teams) {
            if (t.get("lat") == null) continue;
            double tl = (Double) t.get("lat"), tg = (Double) t.get("lng");
            t.put("km", round1(GeoPolygons.distanceKm(tl, tg, lat, lng)));
            List<Job> before = new ArrayList<>();
            for (Job j : jobs.getOrDefault(((Number) t.get("userId")).longValue(), List.of())) {
                if (j.sosId() == sosId) break;
                before.add(j);
            }
            if ("on_the_way".equals(t.get("status"))) {
                var route = valhallaClient.route(tl, tg, lat, lng, "auto", blockedAreas(lat, lng));
                if (route.isPresent()) {
                    t.put("etaMin", (int) Math.ceil(route.get().timeMinutes()));
                    t.put("km", round1(route.get().distanceKm()));
                    t.put("route", route.get().shape());
                    continue;
                }
            }
            t.put("etaMin", minutesAfterJobs(new double[]{tl, tg}, before, lat, lng));
            t.put("queued", !before.isEmpty());
        }
        return teams;
    }

    /** Messages the units sent to the person (shown on their SOS card). */
    public List<Map<String, Object>> toPerson(long sosId) {
        return messages(sosId).stream().filter(m -> (Boolean) m.get("toPerson")).toList();
    }

    // ── Road route for a unit ──────────────────────────────────────────────────

    private List<List<double[]>> blockedAreas(double lat, double lng) {
        List<List<double[]>> avoid = new ArrayList<>();
        for (BlockedRoad b : blockedRoadRepository.findCurrentlyBlocked(LocalDateTime.now())) {
            GeoPolygons.outerRings(objectMapper, b.getBoundaryGeojson()).stream()
                    .filter(r -> !GeoPolygons.contains(r, lat, lng)).forEach(avoid::add);
        }
        return avoid;
    }

    /** Driving route to the person with turn positions; avoids blocked roads, not the flood zones they must enter. */
    public Map<String, Object> route(double fromLat, double fromLng, double toLat, double toLng) {
        Map<String, Object> out = new LinkedHashMap<>();
        valhallaClient.route(fromLat, fromLng, toLat, toLng, "auto", blockedAreas(toLat, toLng)).ifPresentOrElse(r -> {
            out.put("route", Map.of("type", "LineString", "coordinates", r.shape()));
            out.put("distanceKm", round1(r.distanceKm()));
            out.put("etaMin", (int) Math.ceil(r.timeMinutes()));
            out.put("instructions", r.instructions());
            // turn-by-turn: each instruction and the route point where it starts
            List<Map<String, Object>> turns = new ArrayList<>();
            for (int i = 0; i < r.instructions().size(); i++) {
                int idx = Math.min(r.turnIndex().get(i), r.shape().size() - 1);
                turns.add(Map.of("text", r.instructions().get(i), "at", r.shape().get(idx), "index", idx));
            }
            out.put("turns", turns);
            out.put("routingAvailable", true);
        }, () -> {
            out.put("route", Map.of("type", "LineString", "coordinates", List.of(new double[]{fromLng, fromLat}, new double[]{toLng, toLat})));
            double km = GeoPolygons.distanceKm(fromLat, fromLng, toLat, toLng);
            out.put("distanceKm", round1(km));
            out.put("etaMin", (int) Math.ceil(km / SPEED_KMH * 60));
            out.put("instructions", List.of());
            out.put("turns", List.of());
            out.put("routingAvailable", false);
        });
        return out;
    }
}
