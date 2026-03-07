package com.ddas.api.config;

import com.ddas.api.entity.AlertType;
import com.ddas.api.repository.AlertTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AlertDataInitializer implements CommandLineRunner {

    private final AlertTypeRepository alertTypeRepository;

    @Override
    public void run(String... args) {
        if (alertTypeRepository.count() == 0) {
            log.info("Initializing default alert types...");
            
            List<AlertType> types = Arrays.asList(
                AlertType.builder()
                    .code("DAM_WATER_HIGH")
                    .name("High Water Level")
                    .nameSi("ඉහළ ජල මට්ටම")
                    .category(AlertType.AlertCategory.dam)
                    .severity(AlertType.AlertSeverity.warning)
                    .icon("water-alert")
                    .color("#F59E0B")
                    .active(true)
                    .displayOrder(1)
                    .titleTemplate("High Water Level at {dam_name}")
                    .bodyTemplate("The water level at {dam_name} has reached a warning threshold.")
                    .build(),
                AlertType.builder()
                    .code("DAM_WATER_CRITICAL")
                    .name("Critical Water Level")
                    .nameSi("ආන්තික ජල මට්ටම")
                    .category(AlertType.AlertCategory.dam)
                    .severity(AlertType.AlertSeverity.critical)
                    .icon("water-alert")
                    .color("#EF4444")
                    .active(true)
                    .displayOrder(2)
                    .acknowledgmentRequired(true)
                    .titleTemplate("CRITICAL: Water Level at {dam_name}")
                    .bodyTemplate("IMMEDIATE ATTENTION: {dam_name} water level is at critical stage!")
                    .build(),
                AlertType.builder()
                    .code("EVACUATION_ORDER")
                    .name("Evacuation Order")
                    .nameSi("ඉවත්වීමේ නියෝගය")
                    .category(AlertType.AlertCategory.evacuation)
                    .severity(AlertType.AlertSeverity.emergency)
                    .icon("run-fast")
                    .color("#DC2626")
                    .active(true)
                    .displayOrder(3)
                    .acknowledgmentRequired(true)
                    .titleTemplate("EVACUATE NOW: {zone_name}")
                    .bodyTemplate("DANGER: Please evacuate {zone_name} immediately following established protocols.")
                    .build()
            );
            
            alertTypeRepository.saveAll(types);
            log.info("Default alert types initialized successfully.");
        }
    }
}
