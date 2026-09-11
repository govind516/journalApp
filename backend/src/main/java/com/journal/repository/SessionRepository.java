package com.journal.repository;

import com.journal.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, String> {
    void deleteByToken(String token);
    void deleteByUserId(String userId);
    List<Session> findByUserIdAndExpiresAtAfterOrderByExpiresAtAsc(String userId, Instant now);
    long deleteByExpiresAtBefore(Instant now);
}
