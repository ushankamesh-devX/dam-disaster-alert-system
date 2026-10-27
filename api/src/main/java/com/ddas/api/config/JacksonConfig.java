package com.ddas.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Date/Time දත්ත නිවැරදිව හසුරුවා ගැනීමට මෙය අත්‍යවශ්‍ය වේ
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}