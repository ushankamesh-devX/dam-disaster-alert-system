package com.ddas.api.repository;

import com.ddas.api.entity.NewsPushLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NewsPushLogRepository extends JpaRepository<NewsPushLog, Long> {
    List<NewsPushLog> findByArticleId(Long articleId);
}
