package com.journal.controller;

import com.journal.dto.AskRequest;
import com.journal.dto.AskResponse;
import com.journal.service.AskService;
import com.journal.util.CurrentUserHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ask")
public class AskController {

    private final AskService askService;

    public AskController(AskService askService) {
        this.askService = askService;
    }

    @PostMapping
    public AskResponse ask(@RequestBody AskRequest request) {
        return askService.ask(CurrentUserHolder.requireUser(), request == null ? null : request.getQuestion());
    }
}
