package com.ddas.api.service;

import com.ddas.api.dto.request.news.ArticleSaveRequest;
import com.ddas.api.dto.request.news.ArticleViewRequest;
import com.ddas.api.dto.response.news.NewsArticleResponse;
import com.ddas.api.entity.NewsArticle;
import com.ddas.api.entity.NewsUserInteraction;
import com.ddas.api.entity.User;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.NewsMapper;
import com.ddas.api.repository.NewsArticleRepository;
import com.ddas.api.repository.NewsUserInteractionRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsUserInteractionService {

    private final NewsUserInteractionRepository interactionRepository;
    private final NewsArticleRepository articleRepository;
    private final UserRepository userRepository;
    private final NewsMapper newsMapper;

    @Transactional
    public void saveArticleForUser(Long articleId, ArticleSaveRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        NewsArticle article = articleRepository.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));

        NewsUserInteraction interaction = interactionRepository.findByUserIdAndArticleId(user.getId(), article.getId())
                .orElse(new NewsUserInteraction());

        if (interaction.getId() == null) {
            interaction.setUser(user);
            interaction.setArticle(article);
        }

        interaction.setHasSaved(request.getHasSaved());
        interactionRepository.save(interaction);

        // Update article save count
        if (Boolean.TRUE.equals(request.getHasSaved())) {
            article.setSaveCount(article.getSaveCount() + 1);
        } else if (article.getSaveCount() > 0) {
            article.setSaveCount(article.getSaveCount() - 1);
        }
        articleRepository.save(article);
    }

    @Transactional
    public void markArticleViewed(Long articleId, ArticleViewRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        NewsArticle article = articleRepository.findById(articleId)
                .orElseThrow(() -> new ResourceNotFoundException("Article not found"));

        NewsUserInteraction interaction = interactionRepository.findByUserIdAndArticleId(user.getId(), article.getId())
                .orElse(new NewsUserInteraction());

        if (interaction.getId() == null) {
            interaction.setUser(user);
            interaction.setArticle(article);
            interaction.setHasSaved(false); // default if new
        }

        interaction.setHasViewed(true);
        interaction.setViewedAt(LocalDateTime.now());

        if (request.getReadProgress() != null) {
            interaction.setReadProgress(request.getReadProgress());
        }
        if (request.getReadTimeSeconds() != null) {
            interaction.setReadTimeSeconds(
                    (interaction.getReadTimeSeconds() != null ? interaction.getReadTimeSeconds() : 0)
                            + request.getReadTimeSeconds());
        }

        interactionRepository.save(interaction);

        // Update article view count
        article.setViewCount((article.getViewCount() != null ? article.getViewCount() : 0) + 1);
        articleRepository.save(article);
    }

    @Transactional(readOnly = true)
    public List<NewsArticleResponse> getSavedArticlesByUserId(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found");
        }

        List<NewsUserInteraction> savedInteractions = interactionRepository.findByUserIdAndHasSavedTrue(userId);

        return savedInteractions.stream()
                .map(NewsUserInteraction::getArticle)
                .map(newsMapper::toNewsArticleResponse)
                .collect(Collectors.toList());
    }
}
