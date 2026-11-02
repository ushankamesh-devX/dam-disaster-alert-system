package com.ddas.api.controller;

import com.ddas.api.exception.BadRequestException;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.ResponderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Mobile app for demo responder teams: missions (SOS assigned to their station), live position, route. */
@RestController
@RequestMapping("/api/v1/responder")
@RequiredArgsConstructor
@PreAuthorize("hasRole('RESPONDER')")
public class ResponderController {

    private final ResponderService service;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(service.me(me.getUser().getId()));
    }

    @GetMapping("/missions")
    public ResponseEntity<List<Map<String, Object>>> missions(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(service.missions(me.getUser().getId()));
    }

    /** action: accept | arrived | resolve. Body (resolve): { notes } */
    @PostMapping("/missions/{id}/{action}")
    public ResponseEntity<Void> update(@PathVariable Long id, @PathVariable String action,
                                       @RequestBody(required = false) Map<String, String> body,
                                       @AuthenticationPrincipal UserPrincipal me) {
        service.update(me.getUser().getId(), id, action, body == null ? null : body.get("notes"));
        return ResponseEntity.noContent().build();
    }

    /** Body: { lat, lng }. Send about every 10 s while on a mission. */
    @PostMapping("/location")
    public ResponseEntity<Map<String, Integer>> location(@RequestBody Map<String, Object> body,
                                                         @AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(Map.of("missions", service.location(me.getUser().getId(), num(body, "lat"), num(body, "lng"))));
    }

    /** Body: { fromLat, fromLng, toLat, toLng } */
    @PostMapping("/route")
    public ResponseEntity<Map<String, Object>> route(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.route(num(body, "fromLat"), num(body, "fromLng"), num(body, "toLat"), num(body, "toLng")));
    }

    private static double num(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) throw new BadRequestException(key + " is required");
        return Double.parseDouble(String.valueOf(v));
    }
}
