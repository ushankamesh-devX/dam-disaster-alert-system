package com.ddas.api.service;

import com.ddas.api.dto.request.BulkUpsertSystemSafeLocationsRequest;
import com.ddas.api.dto.request.CreateSystemSafeLocationRequest;
import com.ddas.api.dto.request.UpdateSystemSafeLocationRequest;
import com.ddas.api.dto.response.SystemSafeLocationResponse;
import com.ddas.api.entity.SystemSafeLocation;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.SystemSafeLocationMapper;
import com.ddas.api.repository.SystemSafeLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemSafeLocationService {

    private final SystemSafeLocationRepository repository;
    private final SystemSafeLocationMapper mapper;

    @Transactional(readOnly = true)
    public Page<SystemSafeLocationResponse> getAll(Pageable pageable) {
        return repository.findAllByDeletedAtIsNull(pageable)
                .map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<SystemSafeLocationResponse> getAllList() {
        return repository.findAllByDeletedAtIsNull()
                .stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SystemSafeLocationResponse getById(Long id) {
        SystemSafeLocation e = repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("System safe location not found with id: " + id));
        return mapper.toResponse(e);
    }

    @Transactional(readOnly = true)
    public SystemSafeLocationResponse getByUuid(String uuid) {
        SystemSafeLocation e = repository.findByUuidAndDeletedAtIsNull(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("System safe location not found with uuid: " + uuid));
        return mapper.toResponse(e);
    }

    @Transactional
    public SystemSafeLocationResponse create(CreateSystemSafeLocationRequest request) {
        log.info("Creating system safe location: {}", request.getCode());

        if (repository.existsByUuid(request.getUuid())) {
            throw new BadRequestException("System safe location already exists for uuid: " + request.getUuid());
        }
        if (repository.existsByCode(request.getCode())) {
            throw new BadRequestException("System safe location already exists for code: " + request.getCode());
        }

        SystemSafeLocation e = mapper.toEntity(request);
        SystemSafeLocation saved = repository.save(e);
        return mapper.toResponse(saved);
    }

    @Transactional
    public SystemSafeLocationResponse update(Long id, UpdateSystemSafeLocationRequest request) {
        log.info("Updating system safe location id: {}", id);

        SystemSafeLocation e = repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("System safe location not found with id: " + id));

        mapper.updateFromRequest(e, request);
        SystemSafeLocation saved = repository.save(e);
        return mapper.toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        SystemSafeLocation e = repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("System safe location not found with id: " + id));
        e.setDeletedAt(LocalDateTime.now());
        repository.save(e);
    }

    @Transactional
    public void deleteByUuid(String uuid) {
        SystemSafeLocation e = repository.findByUuidAndDeletedAtIsNull(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("System safe location not found with uuid: " + uuid));
        e.setDeletedAt(LocalDateTime.now());
        repository.save(e);
    }

    @Transactional
    public List<SystemSafeLocationResponse> bulkUpsert(BulkUpsertSystemSafeLocationsRequest request) {
        log.info("Bulk upsert system safe locations: {}", request.getItems() != null ? request.getItems().size() : 0);

        return request.getItems().stream().map(item -> {
            SystemSafeLocation e = repository.findByUuid(item.getUuid())
                    .orElse(SystemSafeLocation.builder().uuid(item.getUuid()).build());

            mapper.applyUpsert(e, item);
            SystemSafeLocation saved = repository.save(e);
            return mapper.toResponse(saved);
        }).toList();
    }
}
