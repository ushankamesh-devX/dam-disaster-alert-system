package com.ddas.api.controller;

import com.ddas.api.dto.request.news.ArticleShareRequest;
import com.ddas.api.dto.request.news.CreateNewsArticleRequest;
import com.ddas.api.dto.request.news.UpdateNewsArticleRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.service.NewsArticleService;
import com.ddas.api.service.NewsImageStorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/news-articles")
@RequiredArgsConstructor
public class NewsArticleController {

    private final NewsArticleService newsArticleService;
    private final NewsImageStorageService newsImageStorageService;

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

    /** POST /api/v1/news-articles (JSON body with imageUrl) */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NewsArticleResponse> createArticle(@Valid @RequestBody CreateNewsArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(newsArticleService.createArticle(request));
    }

    /** POST /api/v1/news-articles (Multipart Form Data supporting direct local binary file upload from PC/mobile) */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<NewsArticleResponse> createArticleWithFile(
            @ModelAttribute @Valid CreateNewsArticleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpServletRequest httpServletRequest) {
        MultipartFile uploadFile = resolveMultipartFile(file, image, httpServletRequest, request.getFile());
        if (uploadFile != null && !uploadFile.isEmpty()) {
            String uploadedUrl = newsImageStorageService.uploadImage(uploadFile);
            request.setImageUrl(uploadedUrl);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(newsArticleService.createArticle(request));
    }

    /** PUT /api/v1/news-articles/{id} (JSON body with imageUrl) */
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NewsArticleResponse> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNewsArticleRequest request) {
        return ResponseEntity.ok(newsArticleService.updateArticle(id, request));
    }

    /** PUT /api/v1/news-articles/{id} (Multipart Form Data supporting direct local binary file upload from PC/mobile) */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<NewsArticleResponse> updateArticleWithFile(
            @PathVariable Long id,
            @ModelAttribute @Valid UpdateNewsArticleRequest request,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpServletRequest httpServletRequest) {
        MultipartFile uploadFile = resolveMultipartFile(file, image, httpServletRequest, request.getFile());
        if (uploadFile != null && !uploadFile.isEmpty()) {
            String uploadedUrl = newsImageStorageService.uploadImage(uploadFile);
            request.setImageUrl(uploadedUrl);
        }
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

    /**
     * POST /api/v1/news-articles/upload-image
     * Direct binary file upload endpoint from PC or mobile.
     * Uploads to MinIO and seamlessly falls back to local disk storage if MinIO is offline.
     */
    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadImage(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpServletRequest httpServletRequest) {
        try {
            MultipartFile targetFile = resolveMultipartFile(file, image, httpServletRequest, null);

            if (targetFile == null || targetFile.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "No image file provided in multipart request. Ensure form field is 'file' or 'image'."));
            }

            String imageUrl = newsImageStorageService.uploadImage(targetFile);
            return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Image upload failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Image upload failed: " + e.getMessage()));
        }
    }

    /** GET /api/v1/news-articles/images/{filename:.+} (retrieves image bytes) */
    @GetMapping("/images/{filename:.+}")
    public ResponseEntity<byte[]> getImage(@PathVariable String filename) {
        return newsImageStorageService.getImageResponse(filename);
    }

    /**
     * Resolves multipart file from explicit parameter, alternate names, or underlying request.
     */
    private MultipartFile resolveMultipartFile(
            MultipartFile file,
            MultipartFile image,
            HttpServletRequest request,
            MultipartFile fallback) {
        if (file != null && !file.isEmpty()) {
            return file;
        }
        if (image != null && !image.isEmpty()) {
            return image;
        }
        if (fallback != null && !fallback.isEmpty()) {
            return fallback;
        }
        if (request instanceof MultipartHttpServletRequest multipartRequest) {
            Map<String, MultipartFile> fileMap = multipartRequest.getFileMap();
            for (MultipartFile candidate : fileMap.values()) {
                if (candidate != null && !candidate.isEmpty()) {
                    return candidate;
                }
            }
        }
        return null;
    }
}
