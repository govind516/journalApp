package com.journal.controller;

import com.journal.dto.ReflectionResponse;
import com.journal.model.User;
import com.journal.service.ReflectionService;
import com.journal.util.CurrentUserHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reflection")
public class ReflectionController {

    private final ReflectionService reflectionService;

    public ReflectionController(ReflectionService reflectionService) {
        this.reflectionService = reflectionService;
    }

    @GetMapping("/{yearMonth}")
    public ReflectionResponse reflect(@PathVariable String yearMonth) {
        User user = CurrentUserHolder.requireUser();
        return reflectionService.reflect(user, yearMonth);
    }

    @GetMapping("/current")
    public ReflectionResponse current() {
        User user = CurrentUserHolder.requireUser();
        return reflectionService.reflect(user, reflectionService.currentMonth(user.getTimezone()));
    }
}
