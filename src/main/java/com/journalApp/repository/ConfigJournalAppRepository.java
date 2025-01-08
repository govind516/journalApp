package com.journalApp.repository;

import com.journalApp.entity.ConfigJournalApp;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ConfigJournalAppRepository extends MongoRepository<ConfigJournalApp, String> {
}
