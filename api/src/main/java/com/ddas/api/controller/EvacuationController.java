package com.ddas.api.controller;

import com.ddas.api.dto.request.EvacuationRouteRequest;
import com.ddas.api.dto.response.EvacuationRouteResponse;
import com.ddas.api.service.EvacuationRouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public evacuation routing: no login needed, people in danger must not be blocked by auth.
 */
@RestController
@RequestMapping("/api/public/evacuation")
@RequiredArgsConstructor
public class EvacuationController {

    private final EvacuationRouteService evacuationRouteService;

    @PostMapping("/route")
    public ResponseEntity<EvacuationRouteResponse> route(@Valid @RequestBody EvacuationRouteRequest request) {
        return ResponseEntity.ok(evacuationRouteService.findRoute(request));
    }
}
