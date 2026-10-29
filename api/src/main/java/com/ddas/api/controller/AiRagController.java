package com.ddas.api.controller;

import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.service.AiRagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AiRagController {

    private final AiRagService aiRagService;

    @PostMapping("/api/v1/ai/chat")
    public ResponseEntity<ApiResponse<Object>> chat(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(aiRagService.chat(body)));
    }

    @PostMapping("/api/v1/admin/ai/documents")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> indexDocument(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(aiRagService.indexDocument(body)));
    }

    @GetMapping("/api/v1/admin/ai/documents")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> listDocuments(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "damId", required = false) Long damId
    ) {
        return ResponseEntity.ok(ApiResponse.success(aiRagService.listDocuments(category, damId)));
    }

    @GetMapping("/api/v1/admin/ai/documents/{id}")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getDocument(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(aiRagService.getDocument(id)));
    }

    @DeleteMapping("/api/v1/admin/ai/documents/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> deleteDocument(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(aiRagService.deleteDocument(id)));
    }
}

