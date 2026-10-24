package com.ddas.api.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Read/write split for the k8s MySQL InnoDB Cluster.
 *
 * Writes and normal transactions  → writer pool → MySQL Router :6446 → PRIMARY
 * {@code @Transactional(readOnly = true)} → reader pool → MySQL Router :6447 → replicas
 *
 * Only active when ddas.datasource.reader-url is set, so local docker-compose
 * keeps using Spring Boot's default single DataSource.
 */
@Configuration
@ConditionalOnExpression("!'${ddas.datasource.reader-url:}'.isBlank()")
public class ReadWriteRoutingConfig {

    @Bean
    @Primary
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String writerUrl,
            @Value("${ddas.datasource.reader-url}") String readerUrl,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {

        HikariDataSource writer = pool("ddas-writer", writerUrl, username, password);
        HikariDataSource reader = pool("ddas-reader", readerUrl, username, password);
        reader.setReadOnly(true);

        LazyConnectionDataSourceProxy proxy = new LazyConnectionDataSourceProxy();
        proxy.setTargetDataSource(writer);
        proxy.setReadOnlyDataSource(reader);
        proxy.setDefaultAutoCommit(true);
        proxy.setDefaultTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
        proxy.afterPropertiesSet();
        return proxy;
    }

    private static HikariDataSource pool(String name, String url, String username, String password) {
        HikariDataSource ds = new HikariDataSource();
        ds.setPoolName(name);
        ds.setJdbcUrl(url);
        ds.setUsername(username);
        ds.setPassword(password);
        ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
        ds.setMaximumPoolSize(5);
        ds.setConnectionTimeout(5_000);   // fail fast while the cluster elects a new primary
        ds.setMaxLifetime(300_000);
        return ds;
    }
}
