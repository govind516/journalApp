package com.journal.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class EntryWrite {
    private String date;
    private String content = "";
    private String mood;
    private List<String> tags = new ArrayList<>();
    private boolean backfilled = false;
}
