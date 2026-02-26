package com.ddas.api.controller;

import com.ddas.api.dto.request.news.CreateNewsCategoryRequest;
import com.ddas.api.dto.request.news.UpdateNewsCategoryRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.dto.response.news.NewsCategoryResponse;
import com.ddas.api.service.NewsArticleService;
import com.ddas.api.service.NewsCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/news-categories")
@RequiredArgsConstructor
public class NewsCategoryController {

    private final NewsCategoryService newsCategoryService;
    private final NewsArticleService newsArticleService;

    /** GET /api/v1/news-categories */
    @GetMapping
    public ResponseEntity<List<NewsCategoryResponse>> getAllCategories() {
        return ResponseEntity.ok(newsCategoryService.getAllCategories());
    }

    /** GET /api/v1/news-categories/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<NewsCategoryResponse> getCategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(newsCategoryService.getCategoryById(id));
    }

    /** GET /api/v1/news-categories/{id}/articles */
    @GetMapping("/{id}/articles")
    public ResponseEntity<Page<NewsArticleResponse>> getArticlesByCategory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(newsArticleService.getArticlesByCategory(id, pageable));
    }

    /** POST /api/v1/news-categories */
    @PostMapping
    public ResponseEntity<NewsCategoryResponse> createCategory(
            @Valid @RequestBody CreateNewsCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(newsCategoryService.createCategory(request));
    }

    /** PUT /api/v1/news-categories/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<NewsCategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNewsCategoryRequest request) {
        return ResponseEntity.ok(newsCategoryService.updateCategory(id, request));
    }

    /** DELETE /api/v1/news-categories/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        newsCategoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
