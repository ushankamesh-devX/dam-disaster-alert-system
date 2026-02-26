package com.ddas.api.service;

import com.ddas.api.dto.response.news.NewsPushLogResponse;
import com.ddas.api.entity.NewsPushLog;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.NewsArticleRepository;
import com.ddas.api.repository.NewsPushLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NewsPushLogService {

    private final NewsPushLogRepository pushLogRepository;
    private final NewsArticleRepository articleRepository;

    @Transactional(readOnly = true)
    public List<NewsPushLogResponse> getPushLogsByArticleId(Long articleId) {
        if (!articleRepository.existsById(articleId)) {
            throw new ResourceNotFoundException("Article not found with id: " + articleId);
        }
        return pushLogRepository.findByArticleId(articleId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NewsPushLogResponse getPushLogById(Long id) {
        NewsPushLog log = pushLogRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Push log not found with id: " + id));
        return toResponse(log);
    }

    private NewsPushLogResponse toResponse(NewsPushLog log) {
        NewsPushLogResponse resp = new NewsPushLogResponse();
        resp.setId(log.getId());
        resp.setArticleId(log.getArticle() != null ? log.getArticle().getId() : null);
        resp.setArticleTitle(log.getArticle() != null ? log.getArticle().getTitle() : null);
        resp.setTotalRecipients(log.getTotalRecipients());
        resp.setSentCount(log.getSentCount());
        resp.setDeliveredCount(log.getDeliveredCount());
        resp.setFailedCount(log.getFailedCount());
        resp.setOpenedCount(log.getOpenedCount());
        resp.setProvider(log.getProvider());
        resp.setBatchId(log.getBatchId());
        resp.setSentAt(log.getSentAt());
        resp.setCompletedAt(log.getCompletedAt());
        return resp;
    }
}
