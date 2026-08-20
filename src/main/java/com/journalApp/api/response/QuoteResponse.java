package com.journalApp.api.response;

public class QuoteResponse {

    public String quote;

    public QuoteResponse() {
    }

    public QuoteResponse(String quote) {
        this.quote = quote;
    }

    public String getQuote() {
        return quote;
    }

    public void setQuote(String quote) {
        this.quote = quote;
    }
}