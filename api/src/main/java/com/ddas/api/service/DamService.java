package com.ddas.api.service;

import com.ddas.api.dto.request.*;
import com.ddas.api.dto.response.*;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.DamMapper;
import com.ddas.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DamService {
    
    private final DamRepository damRepository;
    private final RegionRepository regionRepository;
    private final HazardLevelRepository hazardLevelRepository;
    private final DamCurrentStatusRepository damCurrentStatusRepository;
    private final DamHazardZoneRepository damHazardZoneRepository;
    private final DamGateRepository damGateRepository;
    private final DamMapper damMapper;
    
    // ============== DAM CRUD OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public Page<DamListResponse> getAllDams(Pageable pageable) {
        return damRepository.findAll(pageable)
                .map(damMapper::toDamListResponse);
    }
    
    @Transactional(readOnly = true)
    public List<DamListResponse> getAllDamsList() {
        return damMapper.toDamListResponseList(damRepository.findAll());
    }
    
    @Transactional(readOnly = true)
    public DamResponse getDamById(Long id) {
        Dam dam = damRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + id));
        return damMapper.toDamResponse(dam);
    }
    
    @Transactional(readOnly = true)
    public DamResponse getDamByCode(String code) {
        Dam dam = damRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with code: " + code));
        return damMapper.toDamResponse(dam);
    }
    
    @Transactional(readOnly = true)
    public Page<DamListResponse> searchDams(String searchTerm, Pageable pageable) {
        return damRepository.searchDams(searchTerm, pageable)
                .map(damMapper::toDamListResponse);
    }
    
    @Transactional(readOnly = true)
    public List<DamListResponse> getDamsByRegion(Long regionId) {
        return damMapper.toDamListResponseList(damRepository.findByRegionId(regionId));
    }
    
    @Transactional(readOnly = true)
    public List<DamListResponse> getDamsByStatus(Dam.DamStatus status) {
        return damMapper.toDamListResponseList(damRepository.findByStatus(status));
    }
    
    @Transactional(readOnly = true)
    public List<DamListResponse> getDamsByHazardStatus(Dam.HazardStatus hazardStatus) {
        return damMapper.toDamListResponseList(damRepository.findByOverallHazardStatus(hazardStatus));
    }
    
    @Transactional(readOnly = true)
    public List<DamListResponse> getActiveDams() {
        return damMapper.toDamListResponseList(damRepository.findByStatus(Dam.DamStatus.operational));
    }
    
    @Transactional(readOnly = true)
    public Page<DamListResponse> filterDams(Dam.DamStatus status, Long regionId, Dam.HazardStatus hazardStatus, Pageable pageable) {
        Specification<Dam> spec = Specification.where((Specification<Dam>) null);
        
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (regionId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("region").get("id"), regionId));
        }
        if (hazardStatus != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("overallHazardStatus"), hazardStatus));
        }
        
        return damRepository.findAll(spec, pageable)
                .map(damMapper::toDamListResponse);
    }
    
    @Transactional
    public DamResponse createDam(CreateDamRequest request) {
        log.info("Creating new dam: {}", request.getName());
        
        // Check if code already exists
        if (damRepository.findByCode(request.getCode()).isPresent()) {
            throw new BadRequestException("Dam with code " + request.getCode() + " already exists");
        }
        
        // Get region
        Region region = regionRepository.findById(request.getRegionId())
                .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + request.getRegionId()));
        
        // Get hazard level if provided
        HazardLevel hazardLevel = null;
        if (request.getOverallHazardLevelId() != null) {
            hazardLevel = hazardLevelRepository.findById(request.getOverallHazardLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + request.getOverallHazardLevelId()));
        }
        
        Dam dam = damMapper.toDamEntity(request, region, hazardLevel);
        Dam savedDam = damRepository.save(dam);
        
        // Create initial status record
        createInitialDamStatus(savedDam, hazardLevel);
        
        log.info("Dam created with id: {}", savedDam.getId());
        return damMapper.toDamResponse(savedDam);
    }
    
    private void createInitialDamStatus(Dam dam, HazardLevel hazardLevel) {
        DamCurrentStatus status = DamCurrentStatus.builder()
                .dam(dam)
                .currentHazardLevel(hazardLevel)
                .hazardStatus(Dam.HazardStatus.safe)
                .lastUpdated(LocalDateTime.now())
                .build();
        damCurrentStatusRepository.save(status);
    }
    
    @Transactional
    public DamResponse updateDam(Long id, UpdateDamRequest request) {
        log.info("Updating dam with id: {}", id);
        
        Dam dam = damRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + id));
        
        // Check if new code conflicts
        if (request.getCode() != null && !request.getCode().equals(dam.getCode())) {
            if (damRepository.findByCode(request.getCode()).isPresent()) {
                throw new BadRequestException("Dam with code " + request.getCode() + " already exists");
            }
        }
        
        // Get region if provided
        Region region = null;
        if (request.getRegionId() != null) {
            region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + request.getRegionId()));
        }
        
        // Get hazard level if provided
        HazardLevel hazardLevel = null;
        if (request.getOverallHazardLevelId() != null) {
            hazardLevel = hazardLevelRepository.findById(request.getOverallHazardLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + request.getOverallHazardLevelId()));
        }
        
        damMapper.updateDamFromRequest(dam, request, region, hazardLevel);
        Dam savedDam = damRepository.save(dam);
        
        log.info("Dam updated: {}", savedDam.getId());
        return damMapper.toDamResponse(savedDam);
    }
    
    @Transactional
    public void deleteDam(Long id) {
        log.info("Deleting dam with id: {}", id);
        
        Dam dam = damRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + id));
        
        damRepository.delete(dam);
        log.info("Dam deleted: {}", id);
    }
    
    // ============== DAM STATUS OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public DamCurrentStatusResponse getDamStatus(Long damId) {
        DamCurrentStatus status = damCurrentStatusRepository.findByDamId(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Status not found for dam id: " + damId));
        return damMapper.toDamCurrentStatusResponse(status);
    }
    
    @Transactional(readOnly = true)
    public List<DamCurrentStatusResponse> getAllDamStatuses() {
        return damMapper.toDamCurrentStatusResponseList(damCurrentStatusRepository.findAll());
    }
    
    @Transactional(readOnly = true)
    public List<DamCurrentStatusResponse> getHighRiskDamStatuses() {
        return damMapper.toDamCurrentStatusResponseList(damCurrentStatusRepository.findHighRiskDams());
    }
    
    @Transactional
    public DamCurrentStatusResponse updateDamStatus(Long damId, UpdateDamStatusRequest request) {
        log.info("Updating status for dam id: {}", damId);
        
        DamCurrentStatus status = damCurrentStatusRepository.findByDamId(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Status not found for dam id: " + damId));
        
        // Get hazard level if provided
        HazardLevel hazardLevel = null;
        if (request.getCurrentHazardLevelId() != null) {
            hazardLevel = hazardLevelRepository.findById(request.getCurrentHazardLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + request.getCurrentHazardLevelId()));
        }
        
        damMapper.updateDamCurrentStatusFromRequest(status, request, hazardLevel);
        DamCurrentStatus savedStatus = damCurrentStatusRepository.save(status);
        
        // Update dam's hazard info
        Dam dam = status.getDam();
        if (hazardLevel != null) {
            dam.setOverallHazardLevel(hazardLevel);
        }
        if (request.getHazardStatus() != null) {
            dam.setOverallHazardStatus(request.getHazardStatus());
        }
        dam.setHazardLastAssessedAt(LocalDateTime.now());
        damRepository.save(dam);
        
        log.info("Dam status updated for dam id: {}", damId);
        return damMapper.toDamCurrentStatusResponse(savedStatus);
    }
    
    // ============== HAZARD ZONE OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public List<DamHazardZoneResponse> getDamHazardZones(Long damId) {
        // Verify dam exists
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damMapper.toDamHazardZoneResponseList(damHazardZoneRepository.findByDamId(damId));
    }
    
    @Transactional(readOnly = true)
    public List<DamHazardZoneResponse> getActiveHazardZones(Long damId) {
        return damMapper.toDamHazardZoneResponseList(damHazardZoneRepository.findByDamIdAndIsActiveTrue(damId));
    }
    
    @Transactional(readOnly = true)
    public DamHazardZoneResponse getHazardZoneById(Long zoneId) {
        DamHazardZone zone = damHazardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard zone not found with id: " + zoneId));
        return damMapper.toDamHazardZoneResponse(zone);
    }
    
    @Transactional
    public DamHazardZoneResponse createHazardZone(CreateHazardZoneRequest request) {
        log.info("Creating hazard zone for dam id: {}", request.getDamId());
        
        Dam dam = damRepository.findById(request.getDamId())
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + request.getDamId()));
        
        HazardLevel hazardLevel = hazardLevelRepository.findById(request.getHazardLevelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + request.getHazardLevelId()));
        
        DamHazardZone zone = damMapper.toHazardZoneEntity(request, dam, hazardLevel);
        DamHazardZone savedZone = damHazardZoneRepository.save(zone);
        
        log.info("Hazard zone created with id: {}", savedZone.getId());
        return damMapper.toDamHazardZoneResponse(savedZone);
    }
    
    @Transactional
    public DamHazardZoneResponse updateHazardZone(Long zoneId, UpdateHazardZoneRequest request) {
        log.info("Updating hazard zone with id: {}", zoneId);
        
        DamHazardZone zone = damHazardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard zone not found with id: " + zoneId));
        
        HazardLevel hazardLevel = null;
        if (request.getHazardLevelId() != null) {
            hazardLevel = hazardLevelRepository.findById(request.getHazardLevelId())
                    .orElseThrow(() -> new ResourceNotFoundException("Hazard level not found with id: " + request.getHazardLevelId()));
        }
        
        damMapper.updateHazardZoneFromRequest(zone, request, hazardLevel);
        DamHazardZone savedZone = damHazardZoneRepository.save(zone);
        
        log.info("Hazard zone updated: {}", savedZone.getId());
        return damMapper.toDamHazardZoneResponse(savedZone);
    }
    
    @Transactional
    public void deleteHazardZone(Long zoneId) {
        log.info("Deleting hazard zone with id: {}", zoneId);
        
        DamHazardZone zone = damHazardZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Hazard zone not found with id: " + zoneId));
        
        damHazardZoneRepository.delete(zone);
        log.info("Hazard zone deleted: {}", zoneId);
    }
    
    // ============== GATE OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public List<DamGateResponse> getDamGates(Long damId) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damMapper.toDamGateResponseList(damGateRepository.findByDamId(damId));
    }
    
    @Transactional(readOnly = true)
    public DamGateResponse getGateById(Long gateId) {
        DamGate gate = damGateRepository.findById(gateId)
                .orElseThrow(() -> new ResourceNotFoundException("Gate not found with id: " + gateId));
        return damMapper.toDamGateResponse(gate);
    }
    
    @Transactional(readOnly = true)
    public List<DamGateResponse> getOpenGates(Long damId) {
        return damMapper.toDamGateResponseList(damGateRepository.findOpenGatesByDamId(damId));
    }
    
    @Transactional
    public DamGateResponse createGate(CreateDamGateRequest request) {
        log.info("Creating gate for dam id: {}", request.getDamId());
        
        Dam dam = damRepository.findById(request.getDamId())
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + request.getDamId()));
        
        DamGate gate = damMapper.toDamGateEntity(request, dam);
        DamGate savedGate = damGateRepository.save(gate);
        
        log.info("Gate created with id: {}", savedGate.getId());
        return damMapper.toDamGateResponse(savedGate);
    }
    
    @Transactional
    public DamGateResponse updateGate(Long gateId, UpdateDamGateRequest request) {
        log.info("Updating gate with id: {}", gateId);
        
        DamGate gate = damGateRepository.findById(gateId)
                .orElseThrow(() -> new ResourceNotFoundException("Gate not found with id: " + gateId));
        
        damMapper.updateDamGateFromRequest(gate, request);
        gate.setLastOperationAt(LocalDateTime.now());
        DamGate savedGate = damGateRepository.save(gate);
        
        // Update gate count in dam status
        updateGateCountInStatus(gate.getDam().getId());
        
        log.info("Gate updated: {}", savedGate.getId());
        return damMapper.toDamGateResponse(savedGate);
    }
    
    private void updateGateCountInStatus(Long damId) {
        damCurrentStatusRepository.findByDamId(damId).ifPresent(status -> {
            int openCount = (int) damGateRepository.countOpenGatesByDamId(damId);
            int totalCount = damGateRepository.findByDamId(damId).size();
            status.setGatesOpenCount(openCount);
            status.setTotalGatesCount(totalCount);
            damCurrentStatusRepository.save(status);
        });
    }
    
    @Transactional
    public void deleteGate(Long gateId) {
        log.info("Deleting gate with id: {}", gateId);
        
        DamGate gate = damGateRepository.findById(gateId)
                .orElseThrow(() -> new ResourceNotFoundException("Gate not found with id: " + gateId));
        
        Long damId = gate.getDam().getId();
        damGateRepository.delete(gate);
        updateGateCountInStatus(damId);
        
        log.info("Gate deleted: {}", gateId);
    }
    
    // ============== STATISTICS ==============
    
    @Transactional(readOnly = true)
    public long getTotalDamCount() {
        return damRepository.count();
    }
    
    @Transactional(readOnly = true)
    public long getActiveDamCount() {
        return damRepository.findByStatus(Dam.DamStatus.operational).size();
    }
    
    @Transactional(readOnly = true)
    public long getDamCountByRegion(Long regionId) {
        return damRepository.findByRegionId(regionId).size();
    }
}
