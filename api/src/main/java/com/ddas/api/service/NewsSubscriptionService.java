package com.ddas.api.service;

import com.ddas.api.dto.request.news.CreateNewsSubscriptionRequest;
import com.ddas.api.dto.request.news.UpdateNewsSubscriptionRequest;
import com.ddas.api.dto.response.news.NewsSubscriptionResponse;
import com.ddas.api.entity.NewsCategory;
import com.ddas.api.entity.NewsSubscription;
import com.ddas.api.entity.Region;
import com.ddas.api.entity.User;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.NewsMapper;
import com.ddas.api.repository.NewsCategoryRepository;
import com.ddas.api.repository.NewsSubscriptionRepository;
import com.ddas.api.repository.RegionRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsSubscriptionService {

    private final NewsSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final NewsCategoryRepository categoryRepository;
    private final RegionRepository regionRepository;
    private final NewsMapper newsMapper;

    @Transactional(readOnly = true)
    public List<NewsSubscriptionResponse> getUserSubscriptions(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found");
        }
        return newsMapper.toNewsSubscriptionResponseList(subscriptionRepository.findByUserId(userId));
    }

    @Transactional
    public NewsSubscriptionResponse createSubscription(CreateNewsSubscriptionRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        NewsCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        Region region = null;
        if (request.getRegionId() != null) {
            region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found"));
        }

        NewsSubscription subscription = new NewsSubscription();
        subscription.setUser(user);
        subscription.setCategory(category);
        subscription.setRegion(region);
        subscription.setMinPriority(request.getMinPriority());
        subscription.setPushEnabled(request.getPushEnabled());
        subscription.setEmailEnabled(request.getEmailEnabled());
        subscription.setSmsEnabled(request.getSmsEnabled());

        return newsMapper.toNewsSubscriptionResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public NewsSubscriptionResponse updateSubscription(Long id, UpdateNewsSubscriptionRequest request) {
        NewsSubscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found with id: " + id));

        if (request.getPushEnabled() != null)
            subscription.setPushEnabled(request.getPushEnabled());
        if (request.getEmailEnabled() != null)
            subscription.setEmailEnabled(request.getEmailEnabled());
        if (request.getSmsEnabled() != null)
            subscription.setSmsEnabled(request.getSmsEnabled());
        if (request.getIsActive() != null)
            subscription.setIsActive(request.getIsActive());
        if (request.getMinPriority() != null)
            subscription.setMinPriority(request.getMinPriority());

        return newsMapper.toNewsSubscriptionResponse(subscriptionRepository.save(subscription));
    }

    @Transactional
    public void deleteSubscription(Long id) {
        if (!subscriptionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Subscription not found with id: " + id);
        }
        subscriptionRepository.deleteById(id);
    }
}
