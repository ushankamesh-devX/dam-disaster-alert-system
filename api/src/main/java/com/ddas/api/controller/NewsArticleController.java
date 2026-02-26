package com.ddas.api.controller;

import com.ddas.api.dto.request.news.ArticleShareRequest;
import com.ddas.api.dto.request.news.CreateNewsArticleRequest;
import com.ddas.api.dto.request.news.UpdateNewsArticleRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.service.NewsArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/news-articles")
@RequiredArgsConstructor
public class NewsArticleController {

    private final NewsArticleService newsArticleService;

    /** GET /api/v1/news-articles?status=published&page=0&size=10 */
    @GetMapping
    public ResponseEntity<Page<NewsArticleResponse>> getAllArticles(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(newsArticleService.getAllArticles(pageable, status));
    }

    /** GET /api/v1/news-articles/featured */
    @GetMapping("/featured")
    public ResponseEntity<Page<NewsArticleResponse>> getFeaturedArticles(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("publishDate").descending());
        return ResponseEntity.ok(newsArticleService.getFeaturedArticles(pageable));
    }

    /** GET /api/v1/news-articles/search?q=flood */
    @GetMapping("/search")
    public ResponseEntity<Page<NewsArticleResponse>> searchArticles(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(newsArticleService.searchArticles(q, pageable));
    }

    /** GET /api/v1/news-articles/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<NewsArticleResponse> getArticleById(@PathVariable Long id) {
        return ResponseEntity.ok(newsArticleService.getArticleById(id));
    }

    /** POST /api/v1/news-articles */
    @PostMapping
    public ResponseEntity<NewsArticleResponse> createArticle(@Valid @RequestBody CreateNewsArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(newsArticleService.createArticle(request));
    }

    /** PUT /api/v1/news-articles/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<NewsArticleResponse> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNewsArticleRequest request) {
        return ResponseEntity.ok(newsArticleService.updateArticle(id, request));
    }

    /** PATCH /api/v1/news-articles/{id}/publish */
    @PatchMapping("/{id}/publish")
    public ResponseEntity<NewsArticleResponse> publishArticle(@PathVariable Long id) {
        return ResponseEntity.ok(newsArticleService.publishArticle(id));
    }

    /** PATCH /api/v1/news-articles/{id}/archive */
    @PatchMapping("/{id}/archive")
    public ResponseEntity<NewsArticleResponse> archiveArticle(@PathVariable Long id) {
        return ResponseEntity.ok(newsArticleService.archiveArticle(id));
    }

    /** POST /api/v1/news-articles/{id}/share */
    @PostMapping("/{id}/share")
    public ResponseEntity<Void> shareArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleShareRequest request) {
        newsArticleService.shareArticle(id, request);
        return ResponseEntity.ok().build();
    }

    /** DELETE /api/v1/news-articles/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        newsArticleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }
}
