package com.journal.controller;

import com.journal.dto.SettingsPatch;
import com.journal.dto.UserResponse;
import com.journal.model.User;
import com.journal.repository.UserRepository;
import com.journal.util.CurrentUserHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final UserRepository userRepository;

    public SettingsController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public UserResponse get() {
        return new UserResponse(CurrentUserHolder.requireUser());
    }

    @PatchMapping
    public UserResponse update(@RequestBody SettingsPatch patch) {
        User user = CurrentUserHolder.requireUser();
        if (patch.getName() != null) user.setName(patch.getName());
        if (patch.getTimezone() != null) user.setTimezone(patch.getTimezone());
        if (patch.getReminderEnabled() != null) user.setReminderEnabled(patch.getReminderEnabled());
        if (patch.getReminderTime() != null) user.setReminderTime(patch.getReminderTime());
        if (patch.getStreakAlerts() != null) user.setStreakAlerts(patch.getStreakAlerts());
        return new UserResponse(userRepository.save(user));
    }
}
