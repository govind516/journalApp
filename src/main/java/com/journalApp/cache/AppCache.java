package com.journalApp.cache;

import com.journalApp.entity.ConfigJournalApp;
import com.journalApp.repository.ConfigJournalAppRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AppCache {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AppCache.class);

    public enum keys {
        WEATHER_API,
        QUOTE_API
    }

    @Autowired
    private ConfigJournalAppRepository configJournalAppRepository;

    private Map<String, String> appCache;

    @PostConstruct
    public void init() {
        log.info("Initializing AppCache...");
        appCache = new HashMap<>();
        List<ConfigJournalApp> all = configJournalAppRepository.findAll();
        for (ConfigJournalApp configJournalApp : all) {
            appCache.put(configJournalApp.getKey(), configJournalApp.getValue());
        }
        log.info("AppCache initialized with {} entries", appCache.size());
    }

    public Map<String, String> getAppCache() {
        return appCache;
    }

    public void setAppCache(Map<String, String> appCache) {
        this.appCache = appCache;
    }
}