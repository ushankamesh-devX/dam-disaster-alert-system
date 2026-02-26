package com.ddas.api.controller;

import com.ddas.api.dto.request.news.CreateNewsSubscriptionRequest;
import com.ddas.api.dto.request.news.UpdateNewsSubscriptionRequest;
import com.ddas.api.dto.response.news.NewsSubscriptionResponse;
import com.ddas.api.service.NewsSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class NewsSubscriptionController {

    private final NewsSubscriptionService subscriptionService;

    /** GET /api/v1/users/{userId}/news-subscriptions */
    @GetMapping("/users/{userId}/news-subscriptions")
    public ResponseEntity<List<NewsSubscriptionResponse>> getUserSubscriptions(@PathVariable Long userId) {
        return ResponseEntity.ok(subscriptionService.getUserSubscriptions(userId));
    }

    /** POST /api/v1/news-subscriptions */
    @PostMapping("/news-subscriptions")
    public ResponseEntity<NewsSubscriptionResponse> createSubscription(
            @Valid @RequestBody CreateNewsSubscriptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subscriptionService.createSubscription(request));
    }

    /** PUT /api/v1/news-subscriptions/{id} */
    @PutMapping("/news-subscriptions/{id}")
    public ResponseEntity<NewsSubscriptionResponse> updateSubscription(
            @PathVariable Long id,
            @RequestBody UpdateNewsSubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.updateSubscription(id, request));
    }

    /** DELETE /api/v1/news-subscriptions/{id} */
    @DeleteMapping("/news-subscriptions/{id}")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        subscriptionService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }
}
