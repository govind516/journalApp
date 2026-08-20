package com.journalApp.controller;

import com.journalApp.dto.JournalEntryDTO;
import com.journalApp.entity.JournalEntry;
import com.journalApp.service.JournalEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/journal")
@Tag(name = "3. Journal Entry APIs", description = "Create, Update, Delete and View Entry(s)")
public class JournalEntryController {

    @Autowired
    private JournalEntryService journalEntryService;

    @GetMapping
    @Operation(summary = "Get All Journal Entries of User")
    public ResponseEntity<List<JournalEntry>> getAllJournalEntriesOfUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        List<JournalEntry> entries = journalEntryService.findByUserName(userName);
        if (entries != null && !entries.isEmpty()) {
            return new ResponseEntity<>(entries, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    @Operation(summary = "Create Journal Entry of User")
    public ResponseEntity<JournalEntry> createEntry(@RequestBody JournalEntryDTO journalEntryDTO) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userName = authentication.getName();

            JournalEntry entry = new JournalEntry();
            entry.setTitle(journalEntryDTO.getTitle());
            entry.setContent(journalEntryDTO.getContent());
            entry.setDate(LocalDateTime.now());
            entry.setUserName(userName);
            entry.setSentiment(journalEntryDTO.getSentiment());

            JournalEntry saved = journalEntryService.saveEntry(entry);
            return new ResponseEntity<>(saved, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/id/{myId}")
    @Operation(summary = "Get Journal Entry By its ID")
    public ResponseEntity<JournalEntry> getJournalEntryById(@PathVariable String myId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        ObjectId objectId = new ObjectId(myId);

        Optional<JournalEntry> entry = journalEntryService.findById(objectId);
        if (entry.isPresent() && entry.get().getUserName().equals(userName)) {
            return new ResponseEntity<>(entry.get(), HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("id/{myId}")
    @Operation(summary = "Delete Journal Entry By its ID")
    public ResponseEntity<Void> deleteJournalEntryById(@PathVariable String myId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        ObjectId objectId = new ObjectId(myId);

        boolean removed = journalEntryService.deleteById(objectId, userName);
        if (removed) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PutMapping("id/{myId}")
    @Operation(summary = "Update Journal Entry By its ID")
    public ResponseEntity<JournalEntry> updateJournalById(@PathVariable String myId, @RequestBody JournalEntryDTO journalEntryDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        ObjectId objectId = new ObjectId(myId);

        Optional<JournalEntry> entry = journalEntryService.findById(objectId);
        if (entry.isPresent() && entry.get().getUserName().equals(userName)) {
            JournalEntry old = entry.get();
            if (journalEntryDTO.getTitle() != null && !journalEntryDTO.getTitle().isEmpty()) {
                old.setTitle(journalEntryDTO.getTitle());
            }
            if (journalEntryDTO.getContent() != null && !journalEntryDTO.getContent().isEmpty()) {
                old.setContent(journalEntryDTO.getContent());
            }
            if (journalEntryDTO.getSentiment() != null) {
                old.setSentiment(journalEntryDTO.getSentiment());
            }
            JournalEntry saved = journalEntryService.saveEntry(old);
            return new ResponseEntity<>(saved, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
}
