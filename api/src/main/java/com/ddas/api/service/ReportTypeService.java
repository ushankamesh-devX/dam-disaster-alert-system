package com.ddas.api.service;

import com.ddas.api.dto.request.report.CreateReportTypeRequest;
import com.ddas.api.dto.request.report.UpdateReportTypeRequest;
import com.ddas.api.dto.response.report.ReportTypeResponse;
import com.ddas.api.entity.ReportType;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.ReportMapper;
import com.ddas.api.repository.ReportTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportTypeService {

    private final ReportTypeRepository reportTypeRepository;
    private final ReportMapper reportMapper;

    @Transactional(readOnly = true)
    public List<ReportTypeResponse> getAllReportTypes() {
        List<ReportType> list = reportTypeRepository.findAllByOrderByDisplayOrderAsc();
        return reportMapper.toReportTypeResponseList(list);
    }

    @Transactional(readOnly = true)
    public ReportTypeResponse getReportTypeById(Long id) {
        ReportType type = reportTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report type not found with id: " + id));
        return reportMapper.toReportTypeResponse(type);
    }

    @Transactional(readOnly = true)
    public List<ReportTypeResponse> getReportTypesByCategory(String categoryStr) {
        try {
            ReportType.Category category = ReportType.Category.valueOf(categoryStr.toLowerCase());
            return reportMapper.toReportTypeResponseList(reportTypeRepository.findByCategory(category));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid report type category: " + categoryStr);
        }
    }

    @Transactional
    public ReportTypeResponse createReportType(CreateReportTypeRequest request) {
        if (reportTypeRepository.findByCode(request.getCode()).isPresent()) {
            throw new BadRequestException("Report type code already exists: " + request.getCode());
        }

        ReportType.Category category = ReportType.Category.other;
        if (request.getCategory() != null) {
            try {
                category = ReportType.Category.valueOf(request.getCategory().toLowerCase());
            } catch (IllegalArgumentException ignored) {}
        }

        ReportType.Priority priority = ReportType.Priority.medium;
        if (request.getDefaultPriority() != null) {
            try {
                priority = ReportType.Priority.valueOf(request.getDefaultPriority().toLowerCase());
            } catch (IllegalArgumentException ignored) {}
        }

        ReportType entity = ReportType.builder()
                .code(request.getCode())
                .name(request.getName())
                .nameSi(request.getNameSi())
                .nameTa(request.getNameTa())
                .description(request.getDescription())
                .icon(request.getIcon())
                .color(request.getColor())
                .category(category)
                .defaultPriority(priority)
                .requiresPhoto(Boolean.TRUE.equals(request.getRequiresPhoto()))
                .requiresLocation(request.getRequiresLocation() != null ? request.getRequiresLocation() : true)
                .autoAlertThreshold(request.getAutoAlertThreshold())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        ReportType saved = reportTypeRepository.save(entity);
        return reportMapper.toReportTypeResponse(saved);
    }

    @Transactional
    public ReportTypeResponse updateReportType(Long id, UpdateReportTypeRequest request) {
        ReportType entity = reportTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report type not found with id: " + id));

        if (request.getName() != null) entity.setName(request.getName());
        if (request.getNameSi() != null) entity.setNameSi(request.getNameSi());
        if (request.getNameTa() != null) entity.setNameTa(request.getNameTa());
        if (request.getDescription() != null) entity.setDescription(request.getDescription());
        if (request.getIcon() != null) entity.setIcon(request.getIcon());
        if (request.getColor() != null) entity.setColor(request.getColor());
        if (request.getCategory() != null) {
            try {
                entity.setCategory(ReportType.Category.valueOf(request.getCategory().toLowerCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.getDefaultPriority() != null) {
            try {
                entity.setDefaultPriority(ReportType.Priority.valueOf(request.getDefaultPriority().toLowerCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.getRequiresPhoto() != null) entity.setRequiresPhoto(request.getRequiresPhoto());
        if (request.getRequiresLocation() != null) entity.setRequiresLocation(request.getRequiresLocation());
        if (request.getAutoAlertThreshold() != null) entity.setAutoAlertThreshold(request.getAutoAlertThreshold());
        if (request.getIsActive() != null) entity.setIsActive(request.getIsActive());
        if (request.getDisplayOrder() != null) entity.setDisplayOrder(request.getDisplayOrder());

        ReportType updated = reportTypeRepository.save(entity);
        return reportMapper.toReportTypeResponse(updated);
    }

    @Transactional
    public void deleteReportType(Long id) {
        ReportType entity = reportTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report type not found with id: " + id));
        entity.setIsActive(false);
        reportTypeRepository.save(entity);
    }
}

