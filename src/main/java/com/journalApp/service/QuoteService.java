package com.journalApp.service;

import com.journalApp.api.response.QuoteResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class QuoteService {

    @Value("${ApiKey.quote}")
    private String apiKey;

    private static final String API = "https://api.api-ninjas.com/v1/quotes?X-Api-Key=API_KEY";

    @Autowired
    private RestTemplate restTemplate;

    public List<QuoteResponse> getQuote() {
        String finalAPI = API.replace("API_KEY", apiKey);
        ResponseEntity<List<QuoteResponse>> response = restTemplate.exchange(
                finalAPI,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<QuoteResponse>>() {}
        );

        return response.getBody();
    }
}
