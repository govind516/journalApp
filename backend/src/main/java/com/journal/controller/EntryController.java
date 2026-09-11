package com.journal.controller;

import com.journal.dto.*;
import com.journal.model.User;
import com.journal.service.EntryService;
import com.journal.util.CurrentUserHolder;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final EntryService entryService;

    public EntryController(EntryService entryService) {
        this.entryService = entryService;
    }

    @GetMapping("/today")
    public TodayResponse today() {
        return entryService.today(CurrentUserHolder.requireUser());
    }

    @GetMapping("/date/{entryDate}")
    public EntryResponse byDate(@PathVariable String entryDate) {
        return entryService.byDate(CurrentUserHolder.requireUser(), entryDate);
    }

    @PutMapping("/date/{entryDate}")
    public EntryResponse saveByDate(@PathVariable String entryDate, @Valid @RequestBody EntryWrite payload) {
        return entryService.saveByDate(CurrentUserHolder.requireUser(), entryDate, payload);
    }

    @GetMapping
    public List<EntryResponse> list(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String tag,
            @RequestParam(defaultValue = "") String mood,
            @RequestParam(defaultValue = "100") int limit) {
        int cappedLimit = Math.max(1, Math.min(200, limit));
        return entryService.list(CurrentUserHolder.requireUser(), search, tag, mood, cappedLimit);
    }

    @GetMapping("/{entryId}")
    public EntryResponse get(@PathVariable String entryId) {
        return entryService.get(CurrentUserHolder.requireUser(), entryId);
    }

    @DeleteMapping("/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String entryId) {
        entryService.delete(CurrentUserHolder.requireUser(), entryId);
    }

    @GetMapping("/calendar/{year}")
    public CalendarResponse calendar(@PathVariable int year) {
        return entryService.calendar(CurrentUserHolder.requireUser(), year);
    }

    @GetMapping("/on-this-day/{entryDate}")
    public List<EntryResponse> onThisDay(@PathVariable String entryDate) {
        return entryService.onThisDay(CurrentUserHolder.requireUser(), entryDate);
    }
}
