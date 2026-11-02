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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Response teams for the evacuation command center and the team app (role RESPONDER): dispatch with a
 * ranked choice, several teams per SOS, live team positions, mission chat, broadcasts, backup requests,
 * and an optional autopilot that drives teams nobody is using on a phone.
 *
 * Training system: teams are DDAS accounts linked to OpenStreetMap stations (seed_responders.py); the real
 * services are never contacted. No schema changes: state lives in the existing JSON metadata columns
 * (sos_events.metadata.teams, emergency_service_providers.metadata.team / .inbox) and messages in
 * sos_event_notifications (channel in_app).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TeamService {

    private static final List<String> OPEN = List.of("triggered", "acknowledged", "responding");
    private static final long LIVE_MS = 45_000;          // a phone that reported in the last 45 s drives itself
    private static final double AUTO_SPEED_MPS = 15;     // autopilot driving speed (about 3x real life)
    private static final long AUTO_ACCEPT_MS = 8_000;
    private static final long AUTO_ON_SCENE_MS = 40_000;
    private static final int INBOX_MAX = 20;

    private final JdbcTemplate jdbc;
    private final ValhallaClient valhallaClient;
    private final BlockedRoadRepository blockedRoadRepository;
    private final ObjectMapper objectMapper;

    private final AtomicBoolean autopilot = new AtomicBoolean(false);
    private final Map<String, Drive> drives = new ConcurrentHashMap<>();

    private record Drive(List<double[]> path, int[] step) {}

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

    private void saveStationMeta(long stationId, ObjectNode m) {
        jdbc.update("UPDATE emergency_service_providers SET metadata = CAST(? AS JSON) WHERE id = ?", text(m), stationId);
    }

    private static ObjectNode teamsNode(ObjectNode meta) {
        return meta.has("teams") && meta.get("teams").isObject() ? (ObjectNode) meta.get("teams") : meta.putObject("teams");
    }

    private static double num(Object v) {
        return v instanceof Number n ? n.doubleValue() : Double.parseDouble(String.valueOf(v));
    }

    public static String typeLabel(String type) {
        return switch (String.valueOf(type)) {
            case "hospital" -> "Ambulance";
            case "fire_brigade" -> "Fire & rescue";
            case "police" -> "Police";
            default -> "Response team";
        };
    }

    /** 0 = the right kind of team for this SOS, 1 = can help, 2 = other. */
    private static int typeFit(String sosType, String teamType) {
        String best = switch (String.valueOf(sosType)) {
            case "injured", "medical" -> "hospital";
            case "flood_trapped" -> "fire_brigade";
            case "stranded_vehicle" -> "police";
            default -> "police";
        };
        if (best.equals(teamType)) return 0;
        // second choice: trapped -> police can help; injured -> fire & rescue can help
        boolean second = ("flood_trapped".equals(sosType) && "police".equals(teamType))
                || (("injured".equals(sosType) || "medical".equals(sosType)) && "fire_brigade".equals(teamType))
                || ("stranded_vehicle".equals(sosType) && "fire_brigade".equals(teamType));
        return second ? 1 : 2;
    }

    // ── Teams (command center) ─────────────────────────────────────────────────

    private record Station(long id, String name, String type, double lat, double lng, long userId, String teamName, ObjectNode meta) {
        ObjectNode team() { return meta.has("team") && meta.get("team").isObject() ? (ObjectNode) meta.get("team") : meta.putObject("team"); }
        boolean live() { return team().path("at").asLong(0) > System.currentTimeMillis() - LIVE_MS && !team().path("auto").asBoolean(false); }
        double[] pos() {
            ObjectNode t = team();
            return t.has("lat") && t.has("lng") ? new double[]{t.get("lat").asDouble(), t.get("lng").asDouble()} : new double[]{lat, lng};
        }
    }

    private List<Station> stations() {
        return jdbc.queryForList(
                "SELECT p.id, p.name, p.service_type type, p.latitude lat, p.longitude lng, p.metadata, u.id uid, u.full_name teamName " +
                "FROM emergency_service_providers p JOIN users u ON u.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p.metadata, '$.responderUserId')) AS UNSIGNED) " +
                "WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL").stream()
                .map(r -> new Station(((Number) r.get("id")).longValue(), String.valueOf(r.get("name")), String.valueOf(r.get("type")),
                        num(r.get("lat")), num(r.get("lng")), ((Number) r.get("uid")).longValue(), String.valueOf(r.get("teamName")),
                        json(r.get("metadata"))))
                .toList();
    }

    private Station stationOfUser(long userId) {
        return stations().stream().filter(s -> s.userId() == userId).findFirst()
                .orElseThrow(() -> new BadRequestException("This account is not linked to a station"));
    }

    /** Open SOS calls with their parsed team map. */
    private List<Map<String, Object>> openSos() {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT e.id, e.status, e.latitude lat, e.longitude lng, e.metadata, t.code typeCode FROM sos_events e " +
                "JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.status IN ('triggered','acknowledged','responding')");
        rows.forEach(r -> r.put("meta", json(r.remove("metadata"))));
        return rows;
    }

    /** Every team with its status, position and current mission, for the Teams tab and the map. */
    public List<Map<String, Object>> teams() {
        List<Map<String, Object>> open = openSos();
        long now = System.currentTimeMillis();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Station s : stations()) {
            ObjectNode t = s.team();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stationId", s.id());
            row.put("station", s.name());
            row.put("type", s.type());
            row.put("label", typeLabel(s.type()));
            row.put("userId", s.userId());
            row.put("name", s.teamName());
            double[] p = s.pos();
            row.put("lat", p[0]);
            row.put("lng", p[1]);
            row.put("live", s.live());
            row.put("auto", t.path("auto").asBoolean(false) && autopilot.get());
            long at = t.path("at").asLong(0);
            row.put("lastSeenSeconds", at == 0 ? null : (now - at) / 1000);
            row.put("battery", t.has("battery") ? t.get("battery").asInt() : null);
            boolean onDuty = t.path("onDuty").asBoolean(false) || autopilot.get();
            Map<String, Object> mission = null;
            for (Map<String, Object> sos : open) {
                JsonNode mine = teamsNode((ObjectNode) sos.get("meta")).get(String.valueOf(s.userId()));
                if (mine != null && !"rescued".equals(mine.path("status").asText())) {
                    mission = Map.of("sosId", sos.get("id"), "status", mine.path("status").asText("assigned"),
                            "lat", sos.get("lat"), "lng", sos.get("lng"));
                    break;
                }
            }
            row.put("mission", mission);
            row.put("status", mission != null ? String.valueOf(mission.get("status")) : onDuty ? "available" : "off_duty");
            out.add(row);
        }
        out.sort(Comparator.comparing(r -> String.valueOf(r.get("type"))));
        return out;
    }

    /** Teams ranked for one SOS: right kind first, free before busy, then road time from where the team is now. */
    public List<Map<String, Object>> recommend(long sosId) {
        Map<String, Object> sos = jdbc.queryForList(
                "SELECT e.latitude lat, e.longitude lng, e.metadata, t.code typeCode FROM sos_events e " +
                "JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.id = ?", sosId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("SOS not found: " + sosId));
        double lat = num(sos.get("lat")), lng = num(sos.get("lng"));
        String sosType = String.valueOf(sos.get("typeCode"));
        ObjectNode onThis = teamsNode(json(sos.get("metadata")));

        List<Map<String, Object>> list = new ArrayList<>(teams());
        list.forEach(t -> {
            t.put("fit", typeFit(sosType, String.valueOf(t.get("type"))));
            t.put("busy", t.get("mission") != null);
            t.put("onThisSos", onThis.has(String.valueOf(t.get("userId"))));
            t.put("km", Math.round(GeoPolygons.distanceKm(lat, lng, num(t.get("lat")), num(t.get("lng"))) * 10) / 10.0);
        });
        Comparator<Map<String, Object>> rank = Comparator
                .comparing((Map<String, Object> t) -> (Boolean) t.get("onThisSos"))
                .thenComparing(t -> (Boolean) t.get("busy"))
                .thenComparing(t -> (Integer) t.get("fit"));
        list.sort(rank.thenComparing(t -> (Double) t.get("km")));
        // Road time for the 8 most likely teams (Valhalla); the rest keep the straight-line estimate
        List<List<double[]>> avoid = blockedAreas(lat, lng);
        for (int i = 0; i < list.size(); i++) {
            Map<String, Object> t = list.get(i);
            Integer eta = null;
            if (i < 8) {
                eta = valhallaClient.route(num(t.get("lat")), num(t.get("lng")), lat, lng, "auto", avoid)
                        .map(r -> (int) Math.ceil(r.timeMinutes())).orElse(null);
            }
            t.put("etaMin", eta != null ? eta : (int) Math.ceil((Double) t.get("km") / 40 * 60));
            t.put("roadEta", eta != null);
        }
        list.sort(rank.thenComparing(t -> (Integer) t.get("etaMin")));
        list.stream().filter(t -> !(Boolean) t.get("onThisSos") && !(Boolean) t.get("busy")).findFirst()
                .ifPresent(t -> t.put("recommended", true));
        return list;
    }

    /** Send a team to an SOS. Several teams can be sent to one SOS. */
    @Transactional
    public void dispatch(long sosId, long stationId) {
        Station s = stations().stream().filter(x -> x.id() == stationId).findFirst()
                .orElseThrow(() -> new BadRequestException("This station has no response team"));
        ObjectNode meta = sosMeta(sosId);
        ObjectNode teams = teamsNode(meta);
        String key = String.valueOf(s.userId());
        if (teams.has(key)) throw new BadRequestException(s.teamName() + " is already on this SOS");
        ObjectNode t = teams.putObject(key);
        t.put("stationId", s.id());
        t.put("station", s.name());
        t.put("name", s.teamName());
        t.put("type", s.type());
        t.put("status", "assigned");
        t.put("assignedAt", System.currentTimeMillis());
        double[] p = s.pos();
        t.put("lat", p[0]);
        t.put("lng", p[1]);
        boolean first = !meta.has("assignedProviderName");
        if (first) {
            meta.put("assignedProviderId", s.id());
            meta.put("assignedProviderName", s.name());
        }
        String note = typeLabel(s.type()) + " · " + s.name() + " dispatched";
        int n = jdbc.update("UPDATE sos_events SET status = 'responding', responding_at = COALESCE(responding_at, NOW()), " +
                "acknowledged_at = COALESCE(acknowledged_at, NOW()), " +
                "response_time_seconds = COALESCE(response_time_seconds, TIMESTAMPDIFF(SECOND, triggered_at, NOW())), " +
                "assigned_responder_id = COALESCE(assigned_responder_id, ?), " +
                "response_notes = CASE WHEN response_notes IS NULL OR ? THEN ? ELSE CONCAT(response_notes, '; ', ?) END " +
                "WHERE id = ? AND status IN ('triggered','acknowledged','responding')",
                s.userId(), first, note, note, sosId);
        if (n == 0) throw new BadRequestException("SOS " + sosId + " not found or already closed");
        saveSosMeta(sosId, meta);
        message(sosId, "system", null, "Control room", note + ". Mission sent to the team.", false);   // not repeated in the team inbox
    }

    // ── The team app ───────────────────────────────────────────────────────────

    public Map<String, Object> me(long userId) {
        Station s = stationOfUser(userId);
        Map<String, Object> st = new LinkedHashMap<>();
        st.put("id", s.id());
        st.put("name", s.name());
        st.put("type", s.type());
        st.put("label", typeLabel(s.type()));
        st.put("lat", s.lat());
        st.put("lng", s.lng());
        return Map.of("station", st, "onDuty", s.team().path("onDuty").asBoolean(false));
    }

    /** Missions of this team: open SOS calls it is on, plus the ones closed in the last 6 hours. */
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
                "  AND (e.status IN ('triggered','acknowledged','responding') OR e.resolved_at > NOW() - INTERVAL 6 HOUR) " +
                "ORDER BY e.status = 'resolved', e.triggered_at DESC", key);
        for (Map<String, Object> r : rows) {
            ObjectNode meta = json(r.remove("metadata"));
            ObjectNode teams = teamsNode(meta);
            r.put("teamStatus", teams.path(key).path("status").asText("assigned"));
            r.put("otherTeams", teamList(meta, key));
            r.put("backupRequested", meta.path("backupRequested").asBoolean(false));
        }
        return rows;
    }

    /** accept | arrived | resolve | backup */
    @Transactional
    public void act(long userId, long sosId, String action, String notes) {
        ObjectNode meta = sosMeta(sosId);
        ObjectNode me = (ObjectNode) teamsNode(meta).get(String.valueOf(userId));
        if (me == null) throw new ResourceNotFoundException("Mission " + sosId + " is not assigned to this team");
        String status = jdbc.queryForObject("SELECT status FROM sos_events WHERE id = ?", String.class, sosId);
        if (!OPEN.contains(status)) throw new BadRequestException("Mission " + sosId + " is already closed");
        String name = me.path("name").asText("Team");
        switch (action) {
            case "accept" -> { me.put("status", "on_the_way"); me.put("acceptedAt", System.currentTimeMillis()); }
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
                    if (!"rescued".equals(e.getValue().path("status").asText())) ((ObjectNode) e.getValue()).put("status", "done");
                });
                saveSosMeta(sosId, meta);
                jdbc.update("UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, resolution_notes = ? WHERE id = ?",
                        userId, notes == null || notes.isBlank() ? "Rescued by " + name : notes, sosId);
                message(sosId, "team", userId, name, "Person rescued. Mission closed.", true);
                drives.keySet().removeIf(k -> k.startsWith(sosId + ":"));
                return;
            }
            default -> throw new BadRequestException("Unknown action: " + action);
        }
        saveSosMeta(sosId, meta);
        message(sosId, "team", userId, name, "accept".equals(action) ? "On our way." : "Arrived at the person.", true);
    }

    /** The team's phone position (every few seconds while on duty). */
    @Transactional
    public void location(long userId, double lat, double lng, Integer battery) {
        Station s = stationOfUser(userId);
        ObjectNode t = s.team();
        t.put("lat", lat);
        t.put("lng", lng);
        t.put("at", System.currentTimeMillis());
        t.put("onDuty", true);
        t.put("auto", false);
        if (battery != null) t.put("battery", battery);
        saveStationMeta(s.id(), s.meta());
        moveOnMissions(userId, lat, lng);
    }

    private void moveOnMissions(long userId, double lat, double lng) {
        String key = String.valueOf(userId);
        for (Map<String, Object> sos : openSos()) {
            ObjectNode meta = (ObjectNode) sos.get("meta");
            JsonNode mine = teamsNode(meta).get(key);
            if (mine instanceof ObjectNode o) {
                o.put("lat", lat);
                o.put("lng", lng);
                o.put("at", System.currentTimeMillis());
                saveSosMeta(((Number) sos.get("id")).longValue(), meta);
            }
        }
    }

    public void duty(long userId, boolean onDuty) {
        Station s = stationOfUser(userId);
        s.team().put("onDuty", onDuty);
        saveStationMeta(s.id(), s.meta());
    }

    // ── Messages ───────────────────────────────────────────────────────────────

    /** One message in a mission's chat (sos_event_notifications, channel in_app). */
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
                UUID.randomUUID().toString(), sosId, "team".equals(from) ? "Control room" : "Response teams", text(info),
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

    /** Broadcast to every team, or to one kind (police / hospital / fire_brigade). */
    @Transactional
    public int broadcast(String text, String type, String fromName) {
        if (text == null || text.isBlank()) throw new BadRequestException("Write a message first");
        int n = 0;
        for (Station s : stations()) {
            if (type != null && !type.isBlank() && !type.equals(s.type())) continue;
            ArrayNode inbox = s.meta().has("inbox") && s.meta().get("inbox").isArray()
                    ? (ArrayNode) s.meta().get("inbox") : s.meta().putArray("inbox");
            ObjectNode m = inbox.addObject();
            m.put("id", System.currentTimeMillis() * 10 + n);
            m.put("at", System.currentTimeMillis());
            m.put("fromName", fromName);
            m.put("text", text);
            m.put("to", type == null || type.isBlank() ? "All teams" : typeLabel(type) + " teams");
            while (inbox.size() > INBOX_MAX) inbox.remove(0);
            saveStationMeta(s.id(), s.meta());
            n++;
        }
        return n;
    }

    /** The team's inbox: broadcasts to its station plus control-room messages on its missions, newest first. */
    public List<Map<String, Object>> inbox(long userId) {
        Station s = stationOfUser(userId);
        List<Map<String, Object>> out = new ArrayList<>();
        if (s.meta().get("inbox") instanceof ArrayNode inbox) {
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

    /** Teams on an SOS as a list (name, kind, status, position). */
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

    /** Teams coming to the person, with road distance and time for the ones on the way. */
    public List<Map<String, Object>> comingTo(long sosId, double lat, double lng) {
        List<Map<String, Object>> teams = teamList(sosMeta(sosId), null);
        for (Map<String, Object> t : teams) {
            if (t.get("lat") == null) continue;
            double tl = (Double) t.get("lat"), tg = (Double) t.get("lng");
            double km = GeoPolygons.distanceKm(tl, tg, lat, lng);
            t.put("km", Math.round(km * 10) / 10.0);
            Integer eta = null;
            if ("on_the_way".equals(t.get("status")) || "assigned".equals(t.get("status"))) {
                var route = valhallaClient.route(tl, tg, lat, lng, "auto", blockedAreas(lat, lng));
                if (route.isPresent()) {
                    eta = (int) Math.ceil(route.get().timeMinutes());
                    t.put("km", Math.round(route.get().distanceKm() * 10) / 10.0);
                    t.put("route", route.get().shape());
                }
            }
            t.put("etaMin", eta != null ? eta : (int) Math.ceil(km / 40 * 60));
        }
        return teams;
    }

    /** Messages the teams sent to the person (shown on their SOS card). */
    public List<Map<String, Object>> toPerson(long sosId) {
        return messages(sosId).stream().filter(m -> (Boolean) m.get("toPerson")).toList();
    }

    // ── Road route for a team ──────────────────────────────────────────────────

    private List<List<double[]>> blockedAreas(double lat, double lng) {
        List<List<double[]>> avoid = new ArrayList<>();
        for (BlockedRoad b : blockedRoadRepository.findCurrentlyBlocked(LocalDateTime.now())) {
            GeoPolygons.outerRings(objectMapper, b.getBoundaryGeojson()).stream()
                    .filter(r -> !GeoPolygons.contains(r, lat, lng)).forEach(avoid::add);
        }
        return avoid;
    }

    /** Driving route from the team to the person; avoids blocked roads, not the flood zones they must enter. */
    public Map<String, Object> route(double fromLat, double fromLng, double toLat, double toLng) {
        Map<String, Object> out = new LinkedHashMap<>();
        valhallaClient.route(fromLat, fromLng, toLat, toLng, "auto", blockedAreas(toLat, toLng)).ifPresentOrElse(r -> {
            out.put("route", Map.of("type", "LineString", "coordinates", r.shape()));
            out.put("distanceKm", Math.round(r.distanceKm() * 10) / 10.0);
            out.put("etaMin", (int) Math.ceil(r.timeMinutes()));
            out.put("instructions", r.instructions());
            out.put("routingAvailable", true);
        }, () -> {
            out.put("route", Map.of("type", "LineString", "coordinates", List.of(new double[]{fromLng, fromLat}, new double[]{toLng, toLat})));
            double km = GeoPolygons.distanceKm(fromLat, fromLng, toLat, toLng);
            out.put("distanceKm", Math.round(km * 10) / 10.0);
            out.put("etaMin", (int) Math.ceil(km / 40 * 60));
            out.put("instructions", List.of());
            out.put("routingAvailable", false);
        });
        return out;
    }

    // ── Autopilot: teams nobody is using on a phone accept, drive and rescue by themselves ──

    public boolean isAutopilot() {
        return autopilot.get();
    }

    public void setAutopilot(boolean on) {
        autopilot.set(on);
        if (!on) drives.clear();
        log.info("[TEAMS] Autopilot {}", on ? "ON" : "OFF");
    }

    @Scheduled(initialDelay = 20_000, fixedDelay = 3_000)
    public void autopilotTick() {
        if (!autopilot.get()) return;
        try {
            Map<Long, Station> byUser = new HashMap<>();
            stations().forEach(s -> byUser.put(s.userId(), s));
            long now = System.currentTimeMillis();
            for (Map<String, Object> sos : openSos()) {
                long sosId = ((Number) sos.get("id")).longValue();
                double lat = num(sos.get("lat")), lng = num(sos.get("lng"));
                ObjectNode meta = (ObjectNode) sos.get("meta");
                for (var e : teamsNode(meta).properties()) {
                    Station s = byUser.get(Long.valueOf(e.getKey()));
                    if (s == null || s.live()) continue;          // a real phone drives this team
                    ObjectNode t = (ObjectNode) e.getValue();
                    String status = t.path("status").asText();
                    String key = sosId + ":" + e.getKey();
                    if ("assigned".equals(status) && now - t.path("assignedAt").asLong(now) > AUTO_ACCEPT_MS) {
                        act(s.userId(), sosId, "accept", null);
                    } else if ("on_the_way".equals(status)) {
                        Drive d = drives.computeIfAbsent(key, k -> {
                            double[] p = s.pos();
                            List<double[]> path = valhallaClient.route(p[0], p[1], lat, lng, "auto", blockedAreas(lat, lng))
                                    .map(ValhallaClient.Route::shape).orElse(List.of(new double[]{p[1], p[0]}, new double[]{lng, lat}));
                            return new Drive(path, new int[]{0});
                        });
                        double[] here = advance(d, s.pos(), AUTO_SPEED_MPS * 3);
                        autoPosition(s, here[0], here[1]);
                        if (d.step()[0] >= d.path().size() - 1) {
                            drives.remove(key);
                            act(s.userId(), sosId, "arrived", null);
                        }
                    } else if ("arrived".equals(status) && now - t.path("arrivedAt").asLong(now) > AUTO_ON_SCENE_MS) {
                        act(s.userId(), sosId, "resolve", null);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[TEAMS] Autopilot step failed: {}", e.getMessage());
        }
    }

    /** Move along the path by `metres`; returns the new [lat, lng]. Path points are [lng, lat]. */
    private static double[] advance(Drive d, double[] from, double metres) {
        double lat = from[0], lng = from[1];
        List<double[]> path = d.path();
        while (metres > 0 && d.step()[0] < path.size() - 1) {
            double[] next = path.get(d.step()[0] + 1);
            double dist = GeoPolygons.distanceKm(lat, lng, next[1], next[0]) * 1000;
            if (dist <= metres) {
                lat = next[1];
                lng = next[0];
                d.step()[0]++;
                metres -= dist;
            } else {
                double f = metres / dist;
                lat += (next[1] - lat) * f;
                lng += (next[0] - lng) * f;
                metres = 0;
            }
        }
        return new double[]{lat, lng};
    }

    private void autoPosition(Station s, double lat, double lng) {
        ObjectNode t = s.team();
        t.put("lat", lat);
        t.put("lng", lng);
        t.put("at", System.currentTimeMillis());
        t.put("onDuty", true);
        t.put("auto", true);
        saveStationMeta(s.id(), s.meta());
        moveOnMissions(s.userId(), lat, lng);
    }
}
