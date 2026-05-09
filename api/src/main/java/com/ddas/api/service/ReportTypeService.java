package com.ddas.api.service;

import com.ddas.api.dto.response.report.ReportTypeResponse;
import com.ddas.api.entity.ReportType;
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
    public List<ReportTypeResponse> getAllActiveReportTypes() {
        List<ReportType> types = reportTypeRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        return reportMapper.toReportTypeResponseList(types);
    }

    @Transactional(readOnly = true)
    public ReportTypeResponse getReportTypeById(Long id) {
        ReportType type = reportTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report type not found with id: " + id));
        return reportMapper.toReportTypeResponse(type);
    }

    @Transactional(readOnly = true)
    public List<ReportTypeResponse> getReportTypesByCategory(String category) {
        ReportType.ReportCategory cat = ReportType.ReportCategory.valueOf(category);
        List<ReportType> types = reportTypeRepository.findByCategoryAndIsActiveTrue(cat);
        return reportMapper.toReportTypeResponseList(types);
    }
}
