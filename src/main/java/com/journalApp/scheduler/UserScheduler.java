package com.journalApp.scheduler;

import com.journalApp.cache.AppCache;
import com.journalApp.entity.JournalEntry;
import com.journalApp.entity.User;
import com.journalApp.enums.Sentiment;
import com.journalApp.model.SentimentData;
import com.journalApp.repositoryImpl.UserRepositoryImpl;
import com.journalApp.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class UserScheduler {

    @Autowired
    private UserRepositoryImpl userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AppCache appCache;

    @Autowired
    private KafkaTemplate<String, SentimentData> kafkaTemplate;

    @Scheduled(cron = "0 0 9 * * SUN")
    public void fetchUsersAndSendSaMail() {
        List<User> users = userRepository.getUserForSA();
        for (User user : users) {
            List<JournalEntry> journalEntries = user.getJournalEntryList();
            List<Sentiment> sentiments = extractRecentSentiments(journalEntries);
            Sentiment mostFrequentSentiment = getMostFrequentSentiment(sentiments);
            if (mostFrequentSentiment != null) {
                sendSentimentData(user.getEmail(), mostFrequentSentiment);
            }
        }
    }

    // Extract sentiments from journal entries within the last 7 days
    private List<Sentiment> extractRecentSentiments(List<JournalEntry> journalEntries) {
        return journalEntries.stream()
                .filter(x -> x.getDate().isAfter(LocalDateTime.now().minusDays(7)))
                .map(JournalEntry::getSentiment)
                .toList();
    }

    // Get the most frequent sentiment from the list of sentiments
    private Sentiment getMostFrequentSentiment(List<Sentiment> sentiments) {
        Map<Sentiment, Integer> sentimentCounts = new EnumMap<>(Sentiment.class);
        for (Sentiment sentiment : sentiments) {
            if (sentiment != null) {
                sentimentCounts.put(sentiment, sentimentCounts.getOrDefault(sentiment, 0) + 1);
            }
        }
        return sentimentCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    // Send sentiment data through Kafka or email
    private void sendSentimentData(String email, Sentiment sentiment) {
        SentimentData sentimentData = SentimentData.builder()
                .email(email)
                .sentiment("Sentiment for last 7 days: " + sentiment)
                .build();

        try {
            kafkaTemplate.send("weekly-sentiments", sentimentData.getEmail(), sentimentData);
        } catch (Exception e) {
            emailService.sendEmail(sentimentData.getEmail(), "Sentiment for previous week", sentimentData.getSentiment());
        }
    }

    @Scheduled(cron = "0 0/10 * ? * *")
    public void clearAppCache() {
        appCache.init();
    }
}

