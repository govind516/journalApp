package com.journal.repository;

import com.journal.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<Session, String> {
    void deleteByToken(String token);
    void deleteByUserId(String userId);
}
