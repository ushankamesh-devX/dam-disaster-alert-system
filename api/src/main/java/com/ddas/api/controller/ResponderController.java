package com.ddas.api.controller;

import com.ddas.api.exception.BadRequestException;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Team app (role RESPONDER): duty, live position, missions, mission chat, inbox, route. */
@RestController
@RequestMapping("/api/v1/responder")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONDER')")
public class ResponderController {

    private final TeamService teams;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(teams.me(id(me)));
    }

    /** Body: { onDuty } */
    @PostMapping("/duty")
    public ResponseEntity<Void> duty(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserPrincipal me) {
        teams.duty(id(me), Boolean.TRUE.equals(body.get("onDuty")));
        return ResponseEntity.noContent().build();
    }

    /** Body: { lat, lng, battery? }. About every 5 s while on duty. */
    @PostMapping("/location")
    public ResponseEntity<Void> location(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserPrincipal me) {
        Object battery = body.get("battery");
        teams.location(id(me), num(body, "lat"), num(body, "lng"),
                battery == null ? null : (int) Math.round(Double.parseDouble(String.valueOf(battery))));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/missions")
    public ResponseEntity<List<Map<String, Object>>> missions(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(teams.missions(id(me)));
    }

    /** action: accept | arrived | resolve | backup. Body: { notes? } */
    @PostMapping("/missions/{sosId}/{action}")
    public ResponseEntity<Void> act(@PathVariable Long sosId, @PathVariable String action,
                                    @RequestBody(required = false) Map<String, String> body,
                                    @AuthenticationPrincipal UserPrincipal me) {
        teams.act(id(me), sosId, action, body == null ? null : body.get("notes"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/missions/{sosId}/messages")
    public ResponseEntity<List<Map<String, Object>>> messages(@PathVariable Long sosId) {
        return ResponseEntity.ok(teams.messages(sosId));
    }

    /** Body: { text, toPerson? } — toPerson also shows it on the caller's phone. */
    @PostMapping("/missions/{sosId}/messages")
    public ResponseEntity<Void> send(@PathVariable Long sosId, @RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal UserPrincipal me) {
        teams.message(sosId, "team", id(me), me.getUser().getFullName(), String.valueOf(body.getOrDefault("text", "")),
                Boolean.TRUE.equals(body.get("toPerson")));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/inbox")
    public ResponseEntity<List<Map<String, Object>>> inbox(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(teams.inbox(id(me)));
    }

    /** Body: { fromLat, fromLng, toLat, toLng } */
    @PostMapping("/route")
    public ResponseEntity<Map<String, Object>> route(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(teams.route(num(body, "fromLat"), num(body, "fromLng"), num(body, "toLat"), num(body, "toLng")));
    }

    private static long id(UserPrincipal me) {
        return me.getUser().getId();
    }

    private static double num(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) throw new BadRequestException(key + " is required");
        return Double.parseDouble(String.valueOf(v));
    }
}
