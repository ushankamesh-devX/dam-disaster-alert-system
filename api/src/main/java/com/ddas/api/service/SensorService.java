package com.ddas.api.service;

import com.ddas.api.dto.request.CreateSensorReadingRequest;
import com.ddas.api.dto.request.CreateSensorRequest;
import com.ddas.api.dto.request.UpdateSensorRequest;
import com.ddas.api.dto.response.SensorReadingResponse;
import com.ddas.api.dto.response.SensorResponse;
import com.ddas.api.dto.response.SensorTypeResponse;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.DamMapper;
import com.ddas.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorService {
    
    private final SensorRepository sensorRepository;
    private final SensorTypeRepository sensorTypeRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final DamRepository damRepository;
    private final DamCurrentStatusRepository damCurrentStatusRepository;
    private final DamMapper damMapper;
    
    // ============== SENSOR TYPE OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public List<SensorTypeResponse> getAllSensorTypes() {
        return damMapper.toSensorTypeResponseList(sensorTypeRepository.findAll());
    }
    
    @Transactional(readOnly = true)
    public SensorTypeResponse getSensorTypeById(Long id) {
        SensorType sensorType = sensorTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor type not found with id: " + id));
        return damMapper.toSensorTypeResponse(sensorType);
    }
    
    @Transactional(readOnly = true)
    public SensorTypeResponse getSensorTypeByCode(String code) {
        SensorType sensorType = sensorTypeRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor type not found with code: " + code));
        return damMapper.toSensorTypeResponse(sensorType);
    }
    
    // ============== SENSOR OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public Page<SensorResponse> getAllSensors(Pageable pageable) {
        return sensorRepository.findAll(pageable)
                .map(damMapper::toSensorResponse);
    }
    
    @Transactional(readOnly = true)
    public List<SensorResponse> getSensorsByDam(Long damId) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damMapper.toSensorResponseList(sensorRepository.findByDamId(damId));
    }
    
    @Transactional(readOnly = true)
    public SensorResponse getSensorById(Long id) {
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + id));
        return damMapper.toSensorResponse(sensor);
    }
    
    @Transactional(readOnly = true)
    public SensorResponse getSensorByUid(String sensorUid) {
        Sensor sensor = sensorRepository.findBySensorUid(sensorUid)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with UID: " + sensorUid));
        return damMapper.toSensorResponse(sensor);
    }
    
    @Transactional(readOnly = true)
    public List<SensorResponse> getSensorsByStatus(Sensor.SensorStatus status) {
        return damMapper.toSensorResponseList(sensorRepository.findByStatus(status));
    }
    
    @Transactional(readOnly = true)
    public List<SensorResponse> getActiveSensorsByDam(Long damId) {
        return damMapper.toSensorResponseList(sensorRepository.findActiveSensorsByDamId(damId));
    }
    
    @Transactional(readOnly = true)
    public List<SensorResponse> getSensorsByType(Long sensorTypeId) {
        return damMapper.toSensorResponseList(sensorRepository.findBySensorTypeId(sensorTypeId));
    }
    
    @Transactional(readOnly = true)
    public List<SensorResponse> getProblematicSensorsByDam(Long damId) {
        return damMapper.toSensorResponseList(sensorRepository.findProblematicSensorsByDamId(damId));
    }
    
    @Transactional
    public SensorResponse createSensor(CreateSensorRequest request) {
        log.info("Creating new sensor: {} for dam: {}", request.getName(), request.getDamId());
        
        // Check if sensor UID already exists
        if (sensorRepository.findBySensorUid(request.getSensorUid()).isPresent()) {
            throw new BadRequestException("Sensor with UID " + request.getSensorUid() + " already exists");
        }
        
        Dam dam = damRepository.findById(request.getDamId())
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + request.getDamId()));
        
        SensorType sensorType = sensorTypeRepository.findById(request.getSensorTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sensor type not found with id: " + request.getSensorTypeId()));
        
        Sensor sensor = damMapper.toSensorEntity(request, dam, sensorType);
        Sensor savedSensor = sensorRepository.save(sensor);
        
        log.info("Sensor created with id: {}", savedSensor.getId());
        return damMapper.toSensorResponse(savedSensor);
    }
    
    @Transactional
    public SensorResponse updateSensor(Long id, UpdateSensorRequest request) {
        log.info("Updating sensor with id: {}", id);
        
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + id));
        
        // Check if new UID conflicts
        if (request.getSensorUid() != null && !request.getSensorUid().equals(sensor.getSensorUid())) {
            if (sensorRepository.findBySensorUid(request.getSensorUid()).isPresent()) {
                throw new BadRequestException("Sensor with UID " + request.getSensorUid() + " already exists");
            }
        }
        
        SensorType sensorType = null;
        if (request.getSensorTypeId() != null) {
            sensorType = sensorTypeRepository.findById(request.getSensorTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sensor type not found with id: " + request.getSensorTypeId()));
        }
        
        damMapper.updateSensorFromRequest(sensor, request, sensorType);
        Sensor savedSensor = sensorRepository.save(sensor);
        
        log.info("Sensor updated: {}", savedSensor.getId());
        return damMapper.toSensorResponse(savedSensor);
    }
    
    @Transactional
    public void deleteSensor(Long id) {
        log.info("Deleting sensor with id: {}", id);
        
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + id));
        
        sensorRepository.delete(sensor);
        log.info("Sensor deleted: {}", id);
    }
    
    // ============== SENSOR READING OPERATIONS ==============
    
    @Transactional(readOnly = true)
    public Page<SensorReadingResponse> getSensorReadings(Long sensorId, Pageable pageable) {
        if (!sensorRepository.existsById(sensorId)) {
            throw new ResourceNotFoundException("Sensor not found with id: " + sensorId);
        }
        return sensorReadingRepository.findBySensorIdOrderByRecordedAtDesc(sensorId, pageable)
                .map(damMapper::toSensorReadingResponse);
    }
    
    @Transactional(readOnly = true)
    public List<SensorReadingResponse> getSensorReadingsInTimeRange(Long sensorId, LocalDateTime startTime, LocalDateTime endTime) {
        if (!sensorRepository.existsById(sensorId)) {
            throw new ResourceNotFoundException("Sensor not found with id: " + sensorId);
        }
        return damMapper.toSensorReadingResponseList(
                sensorReadingRepository.findBySensorIdAndRecordedAtBetweenOrderByRecordedAtDesc(sensorId, startTime, endTime));
    }
    
    @Transactional(readOnly = true)
    public SensorReadingResponse getLatestReading(Long sensorId) {
        SensorReading reading = sensorReadingRepository.findLatestBySensorId(sensorId)
                .orElseThrow(() -> new ResourceNotFoundException("No readings found for sensor id: " + sensorId));
        return damMapper.toSensorReadingResponse(reading);
    }
    
    @Transactional(readOnly = true)
    public List<SensorReadingResponse> getLatestReadingsForDam(Long damId) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        
        List<Sensor> sensors = sensorRepository.findByDamId(damId);
        return sensors.stream()
                .map(sensor -> sensorReadingRepository.findLatestBySensorId(sensor.getId()))
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .map(damMapper::toSensorReadingResponse)
                .toList();
    }
    
    @Transactional
    public SensorReadingResponse createReading(CreateSensorReadingRequest request) {
        log.info("Creating reading for sensor id: {}", request.getSensorId());
        
        Sensor sensor = sensorRepository.findById(request.getSensorId())
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + request.getSensorId()));
        
        SensorReading reading = damMapper.toSensorReadingEntity(request, sensor);
        SensorReading savedReading = sensorReadingRepository.save(reading);
        
        // Update sensor's last reading time
        sensor.setLastReadingAt(savedReading.getRecordedAt());
        sensorRepository.save(sensor);
        
        // Update dam status last sensor reading time
        updateDamStatusLastReading(sensor.getDam().getId());
        
        log.info("Reading created with id: {}", savedReading.getId());
        return damMapper.toSensorReadingResponse(savedReading);
    }
    
    @Transactional
    public List<SensorReadingResponse> createBatchReadings(List<CreateSensorReadingRequest> requests) {
        log.info("Creating batch readings, count: {}", requests.size());
        
        return requests.stream()
                .map(this::createReading)
                .toList();
    }
    
    private void updateDamStatusLastReading(Long damId) {
        damCurrentStatusRepository.findByDamId(damId).ifPresent(status -> {
            status.setLastSensorReadingAt(LocalDateTime.now());
            damCurrentStatusRepository.save(status);
        });
    }
    
    // ============== STATISTICS ==============
    
    @Transactional(readOnly = true)
    public Double getAverageReading(Long sensorId, LocalDateTime startTime, LocalDateTime endTime) {
        return sensorReadingRepository.findAverageReadingBySensorIdAndPeriod(sensorId, startTime, endTime);
    }
    
    @Transactional(readOnly = true)
    public BigDecimal getMaxReading(Long sensorId, LocalDateTime startTime, LocalDateTime endTime) {
        return sensorReadingRepository.findMaxReadingBySensorIdAndPeriod(sensorId, startTime, endTime);
    }
    
    @Transactional(readOnly = true)
    public BigDecimal getMinReading(Long sensorId, LocalDateTime startTime, LocalDateTime endTime) {
        return sensorReadingRepository.findMinReadingBySensorIdAndPeriod(sensorId, startTime, endTime);
    }
    
    @Transactional(readOnly = true)
    public long getSensorCountByDam(Long damId) {
        return sensorRepository.countSensorsByDamId(damId);
    }
    
    @Transactional(readOnly = true)
    public long getActiveSensorCountByDam(Long damId) {
        return sensorRepository.countActiveSensorsByDamId(damId);
    }
}
