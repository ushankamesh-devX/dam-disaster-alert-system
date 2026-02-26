package com.ddas.api.controller;

import com.ddas.api.dto.response.LocationTypeResponse;
import com.ddas.api.service.LocationTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/location-types")
@RequiredArgsConstructor
public class LocationTypeController {

    private final LocationTypeService service;

    @GetMapping("/list")
    public ResponseEntity<List<LocationTypeResponse>> listActive() {
        return ResponseEntity.ok(service.getAllActiveList());
    }
}
