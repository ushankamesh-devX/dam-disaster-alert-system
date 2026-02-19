package com.ddas.api.service;

import com.ddas.api.dto.request.CreateRegionRequest;
import com.ddas.api.dto.request.UpdateRegionRequest;
import com.ddas.api.dto.response.RegionResponse;
import com.ddas.api.entity.Region;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.DamMapper;
import com.ddas.api.repository.RegionRepository;
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
public class RegionService {
    
    private final RegionRepository regionRepository;
    private final DamMapper damMapper;
    
    @Transactional(readOnly = true)
    public Page<RegionResponse> getAllRegions(Pageable pageable) {
        return regionRepository.findAll(pageable)
                .map(damMapper::toRegionResponse);
    }
    
    @Transactional(readOnly = true)
    public List<RegionResponse> getAllRegionsList() {
        return damMapper.toRegionResponseList(regionRepository.findAll());
    }
    
    @Transactional(readOnly = true)
    public RegionResponse getRegionById(Long id) {
        Region region = regionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + id));
        return damMapper.toRegionResponse(region);
    }
    
    @Transactional(readOnly = true)
    public List<RegionResponse> getRegionsByCountry(String country) {
        return damMapper.toRegionResponseList(regionRepository.findByCountry(country));
    }
    
    @Transactional(readOnly = true)
    public List<RegionResponse> getRegionsByStateProvince(String stateProvince) {
        return damMapper.toRegionResponseList(regionRepository.findByStateProvince(stateProvince));
    }
    
    @Transactional
    public RegionResponse createRegion(CreateRegionRequest request) {
        log.info("Creating new region: {}", request.getName());
        
        Region region = damMapper.toRegionEntity(request);
        Region savedRegion = regionRepository.save(region);
        
        log.info("Region created with id: {}", savedRegion.getId());
        return damMapper.toRegionResponse(savedRegion);
    }
    
    @Transactional
    public RegionResponse updateRegion(Long id, UpdateRegionRequest request) {
        log.info("Updating region with id: {}", id);
        
        Region region = regionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + id));
        
        damMapper.updateRegionFromRequest(region, request);
        Region savedRegion = regionRepository.save(region);
        
        log.info("Region updated: {}", savedRegion.getId());
        return damMapper.toRegionResponse(savedRegion);
    }
    
    @Transactional
    public void deleteRegion(Long id) {
        log.info("Deleting region with id: {}", id);
        
        Region region = regionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + id));
        
        regionRepository.delete(region);
        log.info("Region deleted: {}", id);
    }
}
