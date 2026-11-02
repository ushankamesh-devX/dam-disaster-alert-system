package com.ddas.api.controller;

import com.ddas.api.dto.request.EvacuationDeviceRequest;
import com.ddas.api.dto.request.EvacuationRouteRequest;
import com.ddas.api.dto.response.EvacuationRouteResponse;
import com.ddas.api.dto.response.EvacuationStatusResponse;
import com.ddas.api.entity.EvacuationDevice;
import com.ddas.api.repository.EvacuationDeviceRepository;
import com.ddas.api.service.EvacuationLiveService;
import com.ddas.api.service.EvacuationPackService;
import com.ddas.api.service.EvacuationRouteService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Public evacuation API: no login needed, people in danger must not be blocked by auth.
 */
@RestController
@RequestMapping("/api/public/evacuation")
@RequiredArgsConstructor
public class EvacuationController {

    private final EvacuationRouteService evacuationRouteService;
    private final EvacuationLiveService liveService;
    private final EvacuationPackService packService;
    private final EvacuationDeviceRepository deviceRepository;

    @PostMapping("/route")
    public ResponseEntity<EvacuationRouteResponse> route(@Valid @RequestBody EvacuationRouteRequest request) {
        return ResponseEntity.ok(evacuationRouteService.findRoute(request));
    }

    /** Register the phone or update its location; call on app start and as the person moves. */
    @PostMapping("/devices")
    @Transactional
    public ResponseEntity<Map<String, Object>> registerDevice(@Valid @RequestBody EvacuationDeviceRequest request) {
        EvacuationDevice device = deviceRepository.findByExpoPushToken(request.getExpoPushToken())
                .orElseGet(() -> EvacuationDevice.builder().expoPushToken(request.getExpoPushToken()).build());
        device.setLatitude(BigDecimal.valueOf(request.getLat()));
        device.setLongitude(BigDecimal.valueOf(request.getLng()));
        device.setMode(request.getMode() == null ? "walk" : request.getMode());
        device.setPhone(request.getPhone());
        device.setLastSeenAt(LocalDateTime.now());
        deviceRepository.save(device);
        return ResponseEntity.ok(Map.of("registered", true));
    }

    @DeleteMapping("/devices/{expoPushToken}")
    @Transactional
    public ResponseEntity<Void> unregisterDevice(@PathVariable String expoPushToken) {
        deviceRepository.deleteByExpoPushToken(expoPushToken);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status")
    public ResponseEntity<EvacuationStatusResponse> status() {
        return ResponseEntity.ok(liveService.status());
    }

    /** Server-Sent Events: a "status" event on connect and whenever the picture changes. */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");   // nginx: pass events through immediately
        response.setHeader("Cache-Control", "no-cache");
        return liveService.subscribe();
    }

    /** Offline route packs; all zones when zoneId is omitted. */
    @GetMapping("/packs")
    public ResponseEntity<List<Map<String, Object>>> packs(@RequestParam(required = false) Long zoneId) {
        return ResponseEntity.ok(packService.packs(zoneId));
    }
}
