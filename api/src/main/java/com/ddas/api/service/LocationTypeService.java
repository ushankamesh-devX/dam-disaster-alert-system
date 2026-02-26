package com.ddas.api.service;

import com.ddas.api.dto.response.LocationTypeResponse;
import com.ddas.api.mapper.LocationTypeMapper;
import com.ddas.api.repository.LocationTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationTypeService {

    private final LocationTypeRepository repository;

    public List<LocationTypeResponse> getAllActiveList() {
        return repository.findAllByIsActiveTrueOrderByDisplayOrderAscNameAsc()
                .stream()
                .map(LocationTypeMapper::toResponse)
                .toList();
    }
}
