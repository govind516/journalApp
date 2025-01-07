package com.journalApp.api.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

@Getter
public class QuoteResponse {

    @JsonProperty("quote")
    public String quote;
}