package com.ddas.api.repository;

import com.ddas.api.entity.Region;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByName(String name);

    List<Region> findByCountry(String country);

    List<Region> findByStateProvince(String stateProvince);

    boolean existsByName(String name);
}
