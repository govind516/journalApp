package com.journalApp.api.response;

public class QuoteResponse {

    private static final java.util.logging.Logger log = java.util.logging.Logger.getLogger(QuoteResponse.class.getName());

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