package com.journalApp.controller;

import com.journalApp.dto.JournalEntryDTO;
import com.journalApp.entity.JournalEntry;
import com.journalApp.entity.User;
import com.journalApp.service.JournalEntryService;
import com.journalApp.service.UserService;
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
import java.util.*;

@RestController
@RequestMapping("/journal")
@Tag(name = "3. Journal Entry APIs", description = "Create, Update, Delete and View Entry(s)")
public class JournalEntryController {

    @Autowired
    private JournalEntryService journalEntryService;

    @Autowired
    private UserService userService;

    @GetMapping
    @Operation(summary = "Get All Journal Entries of User")
    public ResponseEntity<List<JournalEntry>> getAllJournalEntriesOfUser(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User byUserName = userService.findByUserName(userName);
        List<JournalEntry> allEntries = byUserName.getJournalEntryList();
        if(allEntries != null && !allEntries.isEmpty())
            return new ResponseEntity<>(allEntries, HttpStatus.OK);
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping
    @Operation(summary = "Create Journal Entry of User")
    public ResponseEntity<JournalEntry> createEntry(@RequestBody JournalEntryDTO journalEntryDTO){
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userName = authentication.getName();

            // Convert DTO to entity
            JournalEntry myEntry = new JournalEntry();
            myEntry.setTitle(journalEntryDTO.getTitle());
            myEntry.setContent(journalEntryDTO.getContent());
            myEntry.setDate(LocalDateTime.now());

            journalEntryService.saveEntry(myEntry, userName);
            return new ResponseEntity<>(myEntry, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/id/{myId}")
    @Operation(summary = "Get Journal Entry By its ID")
    public ResponseEntity<JournalEntry> getJournalEntryById(@PathVariable String myId) {
        ObjectId objectId = new ObjectId(myId);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User byUserName = userService.findByUserName(userName);
        List<JournalEntry> collect = byUserName.getJournalEntryList().stream().filter(journalEntry -> journalEntry.getId().equals(objectId)).toList();
        if(!collect.isEmpty()){
            Optional<JournalEntry> journalEntry = journalEntryService.findById(objectId);
            return journalEntry.map(entry -> new ResponseEntity<>(entry, HttpStatus.OK))
                    .orElseGet(() -> new ResponseEntity<>(collect.getFirst(), HttpStatus.OK));
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @DeleteMapping("id/{myId}")
    @Operation(summary = "Delete Journal Entry By its ID")
    public ResponseEntity<Void> deleteJournalEntryById(@PathVariable String myId) {
        ObjectId objectId = new ObjectId(myId);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        boolean removed = journalEntryService.deleteById(objectId, username);
        if (removed) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } else{
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PutMapping("id/{myId}")
    @Operation(summary = "Update Journal Entry By its ID")
    public ResponseEntity<JournalEntry> updateJournalById(@PathVariable String myId, @RequestBody JournalEntryDTO journalEntryDTO) {
        ObjectId objectId = new ObjectId(myId);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User byUserName = userService.findByUserName(userName);
        List<JournalEntry> collect = byUserName.getJournalEntryList().stream().filter(x -> x.getId().equals(objectId)).toList();
        if (!collect.isEmpty()) {
            Optional<JournalEntry> journalEntry = journalEntryService.findById(objectId);
            if (journalEntry.isPresent()) {
                JournalEntry old = journalEntry.get();
                old.setTitle(!journalEntryDTO.getTitle().isEmpty() ? journalEntryDTO.getTitle() : old.getTitle());
                old.setContent(journalEntryDTO.getContent() != null && !journalEntryDTO.getContent().isEmpty() ? journalEntryDTO.getContent() : old.getContent());
                journalEntryService.saveEntry(old);
                return new ResponseEntity<>(old, HttpStatus.OK);
            }
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }
}

// Controller --> Service --> Repository
