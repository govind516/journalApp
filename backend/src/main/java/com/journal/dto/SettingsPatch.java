package com.journal.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SettingsPatch {
    private String name;
    private String timezone;
    private Boolean reminderEnabled;
    private String reminderTime;
    private Boolean streakAlerts;
}
