package com.ddas.api.controller;

import com.ddas.api.dto.request.news.ArticleSaveRequest;
import com.ddas.api.dto.request.news.ArticleViewRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.service.NewsUserInteractionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class NewsUserInteractionController {

    private final NewsUserInteractionService interactionService;

    @PostMapping("/news-articles/{id}/save")
    public ResponseEntity<Void> saveArticleForUser(
            @PathVariable Long id,
            @Valid @RequestBody ArticleSaveRequest request) {
        interactionService.saveArticleForUser(id, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/news-articles/{id}/view")
    public ResponseEntity<Void> markArticleViewed(
            @PathVariable Long id,
            @Valid @RequestBody ArticleViewRequest request) {
        interactionService.markArticleViewed(id, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/saved-news")
    public ResponseEntity<List<NewsArticleResponse>> getSavedArticles(@PathVariable Long userId) {
        return ResponseEntity.ok(interactionService.getSavedArticlesByUserId(userId));
    }
}
