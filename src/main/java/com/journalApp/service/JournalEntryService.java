package com.journalApp.service;

import com.journalApp.entity.JournalEntry;
import com.journalApp.repository.JournalEntryRepository;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class JournalEntryService {

    private static final Logger log = LoggerFactory.getLogger(JournalEntryService.class);

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    public JournalEntry saveEntry(JournalEntry journalEntry) {
        return journalEntryRepository.save(journalEntry);
    }

    public List<JournalEntry> findByUserName(String userName) {
        return journalEntryRepository.findByUserName(userName);
    }

    public Optional<JournalEntry> findById(ObjectId id) {
        return journalEntryRepository.findById(id);
    }

    public boolean deleteById(ObjectId id, String userName) {
        Optional<JournalEntry> entry = journalEntryRepository.findById(id);
        if (entry.isPresent() && entry.get().getUserName().equals(userName)) {
            journalEntryRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
