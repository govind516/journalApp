package com.journalApp.service;

import org.bson.types.ObjectId;
import com.journalApp.entity.JournalEntry;
import com.journalApp.entity.User;
import com.journalApp.repository.JournalEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class JournalEntryService {

    private static final Logger log = LoggerFactory.getLogger(JournalEntryService.class);

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private UserService userService;

    @Transactional
    public void saveEntry(JournalEntry journalEntry, String username){
        try {
            User byUserName = userService.findByUserName(username);
            JournalEntry saved = journalEntryRepository.save(journalEntry);
            byUserName.getJournalEntryList().add(saved);
            userService.saveUser(byUserName);
        } catch (Exception e) {
            log.error("Exception : ", e);
            throw new RuntimeException("An error occurred while saving the entry", e);
        }
    }

    public void saveEntry(JournalEntry oldEntry) {
        journalEntryRepository.save(oldEntry);
    }

    public List<JournalEntry> getAll() {
        return journalEntryRepository.findAll();
    }

    public Optional<JournalEntry> findById(ObjectId myId) {
        return journalEntryRepository.findById(myId);
    }

    @Transactional
    public boolean deleteById(ObjectId id, String userName) {
        boolean removed = false;
        try {
            User byUserName = userService.findByUserName(userName);
            removed = byUserName.getJournalEntryList().removeIf(x -> x.getId().equals(id));
            if (removed) {
                userService.saveUser(byUserName);
                journalEntryRepository.deleteById(id);
            }
        } catch (Exception e) {
            log.error("Error ",e);
            throw new RuntimeException("An error occurred while deleting the entry.", e);
        }
        return removed;
    }
}