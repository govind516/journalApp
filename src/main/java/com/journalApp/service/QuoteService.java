package com.journalApp.service;

import com.journalApp.api.response.QuoteResponse;
<<<<<<< HEAD
=======
import com.journalApp.cache.AppCache;
>>>>>>> be3bd1c (Added Email Scheduler and Redis Cloud)
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

<<<<<<< HEAD
    private static final String API = "https://api.api-ninjas.com/v1/quotes?X-Api-Key=API_KEY";
=======
    @Autowired
    private AppCache appCache;
>>>>>>> be3bd1c (Added Email Scheduler and Redis Cloud)

    @Autowired
    private RestTemplate restTemplate;

    public List<QuoteResponse> getQuote() {
<<<<<<< HEAD
        String finalAPI = API.replace("API_KEY", apiKey);
=======
        String finalAPI = appCache.appCache.get(AppCache.keys.QUOTE_API.toString()).replace("<API_KEY>", apiKey);
>>>>>>> be3bd1c (Added Email Scheduler and Redis Cloud)
        ResponseEntity<List<QuoteResponse>> response = restTemplate.exchange(
                finalAPI,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<QuoteResponse>>() {}
        );

        return response.getBody();
    }
}
