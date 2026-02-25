package com.ddas.api.service;

import com.ddas.api.dto.response.HazardLevelResponse;
import com.ddas.api.entity.HazardLevel;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.DamMapper;
import com.ddas.api.repository.HazardLevelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class HazardLevelService {
    
    private final HazardLevelRepository hazardLevelRepository;
    private final DamMapper damMapper;
    
    @Transactional(readOnly = true)
    public Page<HazardLevelResponse> getAllHazardLevels(Pageable pageable) {
        return hazardLevelRepository.findAll(pageable)
                .map(damMapper::toHazardLevelResponse);
    }
    
    @Transactional(readOnly = true)
    public List<HazardLevelResponse> getAllHazardLevelsList() {
        return damMapper.toHazardLevelResponseList(hazardLevelRepository.findAll());
    }
    
    @Transactional(readOnly = true)
    public List<HazardLevelResponse> getActiveHazardLevels() {
        return damMapper.toHazardLevelResponseList(hazardLevelRepository.findByIsActiveTrueOrderByLevelNumberAsc());
    }
    
    @Transactional(readOnly = true)
    public HazardLevelResponse getHazardLevelById(Long id) {
        HazardLevel hazardLevel = hazardLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + id));
        return damMapper.toHazardLevelResponse(hazardLevel);
    }
    
    @Transactional(readOnly = true)
    public HazardLevelResponse getHazardLevelByCode(String code) {
        HazardLevel hazardLevel = hazardLevelRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with code: " + code));
        return damMapper.toHazardLevelResponse(hazardLevel);
    }
    
    @Transactional(readOnly = true)
    public HazardLevelResponse getHazardLevelByNumber(Integer levelNumber) {
        HazardLevel hazardLevel = hazardLevelRepository.findByLevelNumber(levelNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with level number: " + levelNumber));
        return damMapper.toHazardLevelResponse(hazardLevel);
    }
    
    @Transactional(readOnly = true)
    public List<HazardLevelResponse> getEvacuationRequiredLevels() {
        return damMapper.toHazardLevelResponseList(hazardLevelRepository.findByEvacuationRequiredTrue());
    }
    
    public HazardLevel findById(Long id) {
        return hazardLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + id));
    }
}
