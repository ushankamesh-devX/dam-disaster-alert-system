package com.ddas.api.service;

import com.ddas.api.dto.request.news.CreateNewsArticleRequest;
import com.ddas.api.dto.request.news.UpdateNewsArticleRequest;
import com.ddas.api.dto.request.news.ArticleShareRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.entity.Dam;
import com.ddas.api.entity.NewsArticle;
import com.ddas.api.entity.NewsCategory;
import com.ddas.api.entity.NewsUserInteraction;
import com.ddas.api.entity.Region;
import com.ddas.api.entity.User;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.NewsMapper;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.NewsArticleRepository;
import com.ddas.api.repository.NewsCategoryRepository;
import com.ddas.api.repository.NewsUserInteractionRepository;
import com.ddas.api.repository.RegionRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsArticleService {

    private final NewsArticleRepository articleRepository;
    private final NewsCategoryRepository categoryRepository;
    private final RegionRepository regionRepository;
    private final DamRepository damRepository;
    private final UserRepository userRepository;
    private final NewsUserInteractionRepository interactionRepository;
    private final NewsMapper newsMapper;

    // ===================== READ =====================

    @Transactional(readOnly = true)
    public Page<NewsArticleResponse> getAllArticles(Pageable pageable, String status) {
        if (status != null && !status.isEmpty()) {
            return articleRepository.findByStatusAndDeletedAtIsNull(status, pageable)
                    .map(newsMapper::toNewsArticleResponse);
        }
        return articleRepository.findAll(pageable).map(newsMapper::toNewsArticleResponse);
    }

    @Transactional(readOnly = true)
    public NewsArticleResponse getArticleById(Long id) {
        NewsArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Article not found with id: " + id));
        if (article.getDeletedAt() != null) {
            throw new ResourceNotFoundException("News Article not found (deleted)");
        }
        return newsMapper.toNewsArticleResponse(article);
    }

    @Transactional(readOnly = true)
    public Page<NewsArticleResponse> getArticlesByCategory(Long categoryId, Pageable pageable) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Category not found with id: " + categoryId);
        }
        return articleRepository.findByCategoryIdAndDeletedAtIsNull(categoryId, pageable)
                .map(newsMapper::toNewsArticleResponse);
    }

    @Transactional(readOnly = true)
    public Page<NewsArticleResponse> getFeaturedArticles(Pageable pageable) {
        return articleRepository.findByIsFeaturedTrueAndDeletedAtIsNull(pageable)
                .map(newsMapper::toNewsArticleResponse);
    }

    @Transactional(readOnly = true)
    public Page<NewsArticleResponse> searchArticles(String query, Pageable pageable) {
        return articleRepository.findByTitleContainingIgnoreCaseAndDeletedAtIsNull(query, pageable)
                .map(newsMapper::toNewsArticleResponse);
    }

    // ===================== WRITE =====================

    @Transactional
    public NewsArticleResponse createArticle(CreateNewsArticleRequest request) {
        NewsCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Region region = null;
        if (request.getRegionId() != null) {
            region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found"));
        }

        Dam dam = null;
        if (request.getDamId() != null) {
            dam = damRepository.findById(request.getDamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dam not found"));
        }

        String uuid = UUID.randomUUID().toString();
        NewsArticle article = newsMapper.toNewsArticleEntity(request, category, region, dam, uuid);

        if ("published".equalsIgnoreCase(request.getStatus())) {
            article.setPublishDate(LocalDateTime.now());
        }

        return newsMapper.toNewsArticleResponse(articleRepository.save(article));
    }

    @Transactional
    public NewsArticleResponse updateArticle(Long id, UpdateNewsArticleRequest request) {
        NewsArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Article not found with id: " + id));

        if (request.getCategoryId() != null) {
            NewsCategory category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
            article.setCategory(category);
        }
        if (request.getRegionId() != null) {
            Region region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found"));
            article.setRegion(region);
        }
        if (request.getDamId() != null) {
            Dam dam = damRepository.findById(request.getDamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dam not found"));
            article.setDam(dam);
        }

        if (request.getTitle() != null)
            article.setTitle(request.getTitle());
        if (request.getTitleSi() != null)
            article.setTitleSi(request.getTitleSi());
        if (request.getTitleTa() != null)
            article.setTitleTa(request.getTitleTa());
        if (request.getSummary() != null)
            article.setSummary(request.getSummary());
        if (request.getSummarySi() != null)
            article.setSummarySi(request.getSummarySi());
        if (request.getContent() != null)
            article.setContent(request.getContent());
        if (request.getContentSi() != null)
            article.setContentSi(request.getContentSi());
        if (request.getImageUrl() != null)
            article.setImageUrl(request.getImageUrl());
        if (request.getImageAlt() != null)
            article.setImageAlt(request.getImageAlt());
        if (request.getGalleryUrls() != null)
            article.setGalleryUrls(request.getGalleryUrls());
        if (request.getPriorityLevel() != null)
            article.setPriorityLevel(request.getPriorityLevel());
        if (request.getSource() != null)
            article.setSource(request.getSource());
        if (request.getIsNationwide() != null)
            article.setIsNationwide(request.getIsNationwide());
        if (request.getIsFeatured() != null)
            article.setIsFeatured(request.getIsFeatured());

        if (request.getStatus() != null) {
            if ("draft".equalsIgnoreCase(article.getStatus()) && "published".equalsIgnoreCase(request.getStatus())) {
                article.setPublishDate(LocalDateTime.now());
            }
            article.setStatus(request.getStatus());
        }

        return newsMapper.toNewsArticleResponse(articleRepository.save(article));
    }

    @Transactional
    public NewsArticleResponse publishArticle(Long id) {
        NewsArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Article not found with id: " + id));
        article.setStatus("published");
        article.setPublishDate(LocalDateTime.now());
        return newsMapper.toNewsArticleResponse(articleRepository.save(article));
    }

    @Transactional
    public NewsArticleResponse archiveArticle(Long id) {
        NewsArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Article not found with id: " + id));
        article.setStatus("archived");
        return newsMapper.toNewsArticleResponse(articleRepository.save(article));
    }

    @Transactional
    public void shareArticle(Long articleId, ArticleShareRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        NewsArticle article = articleRepository.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));

        NewsUserInteraction interaction = interactionRepository
                .findByUserIdAndArticleId(user.getId(), article.getId())
                .orElse(new NewsUserInteraction());

        if (interaction.getId() == null) {
            interaction.setUser(user);
            interaction.setArticle(article);
            interaction.setHasSaved(false);
        }

        interaction.setHasShared(true);
        interaction.setSharedAt(LocalDateTime.now());
        if (request.getPlatform() != null) {
            interaction.setSharePlatform(request.getPlatform());
        }
        interactionRepository.save(interaction);

        // update share count
        article.setShareCount((article.getShareCount() != null ? article.getShareCount() : 0) + 1);
        articleRepository.save(article);
    }

    @Transactional
    public void deleteArticle(Long id) {
        NewsArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Article not found with id: " + id));
        article.setDeletedAt(LocalDateTime.now());
        articleRepository.save(article);
    }
}
