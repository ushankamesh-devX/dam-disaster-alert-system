package com.ddas.api.repository;

import com.ddas.api.entity.LocationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LocationTypeRepository extends JpaRepository<LocationType, Long> {
    List<LocationType> findAllByIsActiveTrueOrderByDisplayOrderAscNameAsc();
}
