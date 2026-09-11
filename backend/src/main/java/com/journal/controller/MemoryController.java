package com.journal.controller;

import com.journal.dto.MemoryResponse;
import com.journal.model.User;
import com.journal.service.EntryService;
import com.journal.service.MemoryService;
import com.journal.util.CurrentUserHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final MemoryService memoryService;
    private final EntryService entryService;

    public MemoryController(MemoryService memoryService, EntryService entryService) {
        this.memoryService = memoryService;
        this.entryService = entryService;
    }

    @GetMapping
    public MemoryResponse memories() {
        User user = CurrentUserHolder.requireUser();
        return memoryService.memories(user, entryService.todayIso(user.getTimezone()));
    }
}
