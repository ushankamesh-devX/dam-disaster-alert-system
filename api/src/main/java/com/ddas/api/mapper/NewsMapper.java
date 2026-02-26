package com.ddas.api.mapper;

import com.ddas.api.dto.request.news.*;
import com.ddas.api.dto.response.news.*;
import com.ddas.api.entity.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class NewsMapper {

    // ============== NEWS CATEGORY MAPPINGS ==============

    public NewsCategoryResponse toNewsCategoryResponse(NewsCategory category) {
        if (category == null)
            return null;

        NewsCategoryResponse response = new NewsCategoryResponse();
        response.setId(category.getId());
        response.setCode(category.getCode());
        response.setName(category.getName());
        response.setNameSi(category.getNameSi());
        response.setNameTa(category.getNameTa());
        response.setDescription(category.getDescription());
        response.setIcon(category.getIcon());
        response.setColor(category.getColor());
        response.setFilterKey(category.getFilterKey());
        response.setDisplayOrder(category.getDisplayOrder());
        response.setIsActive(category.getIsActive());
        response.setCreatedAt(category.getCreatedAt());
        response.setUpdatedAt(category.getUpdatedAt());
        return response;
    }

    public List<NewsCategoryResponse> toNewsCategoryResponseList(List<NewsCategory> categories) {
        if (categories == null)
            return null;
        return categories.stream()
                .map(this::toNewsCategoryResponse)
                .collect(Collectors.toList());
    }

    public NewsCategory toNewsCategoryEntity(CreateNewsCategoryRequest request) {
        if (request == null)
            return null;

        NewsCategory category = new NewsCategory();
        category.setCode(request.getCode());
        category.setName(request.getName());
        category.setNameSi(request.getNameSi());
        category.setNameTa(request.getNameTa());
        category.setDescription(request.getDescription());
        category.setIcon(request.getIcon());
        category.setColor(request.getColor());
        category.setFilterKey(request.getFilterKey());
        category.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        category.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        return category;
    }

    public void updateNewsCategoryFromRequest(NewsCategory category, UpdateNewsCategoryRequest request) {
        if (request.getName() != null)
            category.setName(request.getName());
        if (request.getNameSi() != null)
            category.setNameSi(request.getNameSi());
        if (request.getNameTa() != null)
            category.setNameTa(request.getNameTa());
        if (request.getDescription() != null)
            category.setDescription(request.getDescription());
        if (request.getIcon() != null)
            category.setIcon(request.getIcon());
        if (request.getColor() != null)
            category.setColor(request.getColor());
        if (request.getDisplayOrder() != null)
            category.setDisplayOrder(request.getDisplayOrder());
        if (request.getIsActive() != null)
            category.setIsActive(request.getIsActive());
    }

    // ============== NEWS ARTICLE MAPPINGS ==============

    public NewsArticleResponse toNewsArticleResponse(NewsArticle article) {
        if (article == null)
            return null;

        NewsArticleResponse response = new NewsArticleResponse();
        response.setId(article.getId());
        response.setUuid(article.getUuid());

        if (article.getCategory() != null) {
            response.setCategoryId(article.getCategory().getId());
            response.setCategoryName(article.getCategory().getName());
            response.setCategoryIcon(article.getCategory().getIcon());
            response.setCategoryColor(article.getCategory().getColor());
        }

        response.setTitle(article.getTitle());
        response.setTitleSi(article.getTitleSi());
        response.setTitleTa(article.getTitleTa());

        response.setSummary(article.getSummary());
        response.setSummarySi(article.getSummarySi());

        response.setContent(article.getContent());
        response.setContentSi(article.getContentSi());

        response.setImageUrl(article.getImageUrl());
        response.setImageAlt(article.getImageAlt());
        response.setGalleryUrls(article.getGalleryUrls());

        response.setPriorityLevel(article.getPriorityLevel());
        response.setSource(article.getSource());
        response.setIsNationwide(article.getIsNationwide());

        if (article.getRegion() != null) {
            response.setRegionId(article.getRegion().getId());
            response.setRegionName(article.getRegion().getName());
        }

        if (article.getDam() != null) {
            response.setDamId(article.getDam().getId());
            response.setDamName(article.getDam().getName());
        }

        response.setStatus(article.getStatus());
        response.setIsFeatured(article.getIsFeatured());
        response.setPublishDate(article.getPublishDate());
        response.setExpiryDate(article.getExpiryDate());

        response.setViewCount(article.getViewCount());
        response.setSaveCount(article.getSaveCount());
        response.setShareCount(article.getShareCount());

        response.setCreatedAt(article.getCreatedAt());
        response.setUpdatedAt(article.getUpdatedAt());

        return response;
    }

    public List<NewsArticleResponse> toNewsArticleResponseList(List<NewsArticle> articles) {
        if (articles == null)
            return null;
        return articles.stream()
                .map(this::toNewsArticleResponse)
                .collect(Collectors.toList());
    }

    public NewsArticle toNewsArticleEntity(CreateNewsArticleRequest request, NewsCategory category, Region region,
            Dam dam, String uuid) {
        if (request == null)
            return null;

        NewsArticle article = new NewsArticle();
        article.setUuid(uuid);
        article.setCategory(category);
        article.setRegion(region);
        article.setDam(dam);

        article.setTitle(request.getTitle());
        article.setTitleSi(request.getTitleSi());
        article.setTitleTa(request.getTitleTa());
        article.setSummary(request.getSummary());
        article.setSummarySi(request.getSummarySi());
        article.setContent(request.getContent());
        article.setContentSi(request.getContentSi());

        article.setImageUrl(request.getImageUrl());
        article.setImageAlt(request.getImageAlt());
        article.setGalleryUrls(request.getGalleryUrls());

        article.setPriorityLevel(request.getPriorityLevel() != null ? request.getPriorityLevel() : "medium");
        article.setSource(request.getSource());
        article.setIsNationwide(request.getIsNationwide() != null ? request.getIsNationwide() : false);

        article.setStatus(request.getStatus() != null ? request.getStatus() : "draft");
        article.setIsFeatured(request.getIsFeatured() != null ? request.getIsFeatured() : false);

        return article;
    }

    // ============== NEWS SUBSCRIPTION MAPPINGS ==============

    public NewsSubscriptionResponse toNewsSubscriptionResponse(NewsSubscription subscription) {
        if (subscription == null)
            return null;

        NewsSubscriptionResponse response = new NewsSubscriptionResponse();
        response.setId(subscription.getId());
        response.setUserId(subscription.getUser() != null ? subscription.getUser().getId() : null);

        if (subscription.getCategory() != null) {
            response.setCategoryId(subscription.getCategory().getId());
            response.setCategoryName(subscription.getCategory().getName());
        }

        if (subscription.getRegion() != null) {
            response.setRegionId(subscription.getRegion().getId());
            response.setRegionName(subscription.getRegion().getName());
        }

        response.setMinPriority(subscription.getMinPriority());
        response.setPushEnabled(subscription.getPushEnabled());
        response.setEmailEnabled(subscription.getEmailEnabled());
        response.setSmsEnabled(subscription.getSmsEnabled());
        response.setIsActive(subscription.getIsActive());

        response.setCreatedAt(subscription.getCreatedAt());
        response.setUpdatedAt(subscription.getUpdatedAt());

        return response;
    }

    public List<NewsSubscriptionResponse> toNewsSubscriptionResponseList(List<NewsSubscription> subscriptions) {
        if (subscriptions == null)
            return null;
        return subscriptions.stream()
                .map(this::toNewsSubscriptionResponse)
                .collect(Collectors.toList());
    }
}
