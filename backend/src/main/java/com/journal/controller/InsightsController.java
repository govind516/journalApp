package com.journal.controller;

import com.journal.dto.InsightsResponse;
import com.journal.service.InsightsService;
import com.journal.util.CurrentUserHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @GetMapping
    public InsightsResponse insights() {
        return insightsService.compute(CurrentUserHolder.requireUser());
    }
}
