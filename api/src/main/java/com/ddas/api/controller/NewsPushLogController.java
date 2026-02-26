package com.ddas.api.controller;

import com.ddas.api.dto.response.news.NewsPushLogResponse;
import com.ddas.api.service.NewsPushLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class NewsPushLogController {

    private final NewsPushLogService pushLogService;

    /** GET /api/v1/news-articles/{id}/push-logs */
    @GetMapping("/news-articles/{id}/push-logs")
    public ResponseEntity<List<NewsPushLogResponse>> getPushLogsByArticle(@PathVariable Long id) {
        return ResponseEntity.ok(pushLogService.getPushLogsByArticleId(id));
    }

    /** GET /api/v1/news-push-logs/{id} */
    @GetMapping("/news-push-logs/{id}")
    public ResponseEntity<NewsPushLogResponse> getPushLogById(@PathVariable Long id) {
        return ResponseEntity.ok(pushLogService.getPushLogById(id));
    }
}
