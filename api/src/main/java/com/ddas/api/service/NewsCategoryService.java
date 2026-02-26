package com.ddas.api.service;

import com.ddas.api.dto.request.news.CreateNewsCategoryRequest;
import com.ddas.api.dto.request.news.UpdateNewsCategoryRequest;
import com.ddas.api.dto.response.news.NewsCategoryResponse;
import com.ddas.api.entity.NewsCategory;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.NewsMapper;
import com.ddas.api.repository.NewsArticleRepository;
import com.ddas.api.repository.NewsCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsCategoryService {

    private final NewsCategoryRepository categoryRepository;
    private final NewsArticleRepository articleRepository;
    private final NewsMapper newsMapper;

    @Transactional(readOnly = true)
    public List<NewsCategoryResponse> getAllCategories() {
        return newsMapper.toNewsCategoryResponseList(categoryRepository.findAll());
    }

    @Transactional(readOnly = true)
    public NewsCategoryResponse getCategoryById(Long id) {
        NewsCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Category not found with id: " + id));
        return newsMapper.toNewsCategoryResponse(category);
    }

    @Transactional
    public NewsCategoryResponse createCategory(CreateNewsCategoryRequest request) {
        if (categoryRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("News Category with code " + request.getCode() + " already exists.");
        }
        NewsCategory category = newsMapper.toNewsCategoryEntity(request);
        return newsMapper.toNewsCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public NewsCategoryResponse updateCategory(Long id, UpdateNewsCategoryRequest request) {
        NewsCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("News Category not found with id: " + id));
        newsMapper.updateNewsCategoryFromRequest(category, request);
        return newsMapper.toNewsCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("News Category not found with id: " + id);
        }
        long articleCount = articleRepository.countByCategoryId(id);
        if (articleCount > 0) {
            throw new IllegalStateException(
                    "Cannot delete category: it still has " + articleCount + " article(s) assigned. " +
                            "Please delete or reassign those articles first.");
        }
        categoryRepository.deleteById(id);
    }
}
