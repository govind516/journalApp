package com.journal.repository;

import com.journal.model.Entry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EntryRepository extends JpaRepository<Entry, String> {
    Optional<Entry> findByUserIdAndDate(String userId, String date);
    Optional<Entry> findByIdAndUserId(String id, String userId);
    List<Entry> findByUserIdOrderByDateDesc(String userId);
    List<Entry> findByUserIdAndDateStartingWith(String userId, String yearPrefix);
    long deleteByIdAndUserId(String id, String userId);
    void deleteByUserId(String userId);

    @Query("SELECT DISTINCT e.userId FROM Entry e")
    List<String> findDistinctUserIds();
}
