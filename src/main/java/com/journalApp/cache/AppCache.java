package com.journalApp.cache;

import com.journalApp.entity.ConfigJournalApp;
import com.journalApp.repository.ConfigJournalAppRepository;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class AppCache {

    public enum keys{
        WEATHER_API,
        QUOTE_API
    }

    @Autowired
    private ConfigJournalAppRepository configJournalAppRepository;

    @Getter
    private Map<String, String> appCache;

    @PostConstruct
    public void init(){
        appCache = new HashMap<>();
        List<ConfigJournalApp> all = configJournalAppRepository.findAll();
        for(ConfigJournalApp configJournalApp : all){
            appCache.put(configJournalApp.getKey(), configJournalApp.getValue());
        }
    }
}
