package com.journal.service;

import com.journal.repository.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Hygiene: removes session rows past their absolute expiry. Idle-expired
 * rows are deleted on encounter by {@code SessionAuthFilter}; this job
 * catches whatever never sees another request. Same pattern as the backup
 * and reminder schedulers.
 */
@Component
public class SessionPurgeService {

    private static final Logger log = LoggerFactory.getLogger(SessionPurgeService.class);

    private final SessionRepository sessionRepository;

    public SessionPurgeService(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Scheduled(fixedDelay = 24 * 60 * 60 * 1000L)
    @Transactional
    public void purgeExpired() {
        long removed = sessionRepository.deleteByExpiresAtBefore(Instant.now());
        if (removed > 0) {
            log.info("Purged {} expired sessions", removed);
        }
    }
}
