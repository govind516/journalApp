package com.journalApp.service;

import com.journalApp.api.response.WeatherResponse;
<<<<<<< HEAD
=======
import com.journalApp.cache.AppCache;
>>>>>>> be3bd1c (Added Email Scheduler and Redis Cloud)
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WeatherService {

    @Value("${ApiKey.weather}")
    private String apiKey;

<<<<<<< HEAD
    private static final String API = "https://api.weatherstack.com/current?access_key=API_KEY&query=Mathura";

    @Autowired
    private RestTemplate restTemplate;

        public WeatherResponse getWeather(){
        String finalAPI = API.replace("API_KEY", apiKey);
        ResponseEntity<WeatherResponse> response = restTemplate.exchange(finalAPI, HttpMethod.GET, null, WeatherResponse.class);
        return response.getBody();
=======
    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private AppCache appCache;

    @Autowired
    private RedisService redisService;

    public WeatherResponse getWeather(String city){
        WeatherResponse weatherResponse = redisService.get("weather of " + city, WeatherResponse.class);
        if(weatherResponse != null){
            return weatherResponse;
        }
        else{
            String finalAPI = appCache.appCache.get(AppCache.keys.WEATHER_API.toString()).replace("<API_KEY>", apiKey).replace("<CITY>", city);
            ResponseEntity<WeatherResponse> response = restTemplate.exchange(finalAPI, HttpMethod.GET, null, WeatherResponse.class);
            WeatherResponse body = response.getBody();
            if(body != null){
                redisService.set("weather of " + city, body, 300L);
            }
            return body;
        }
>>>>>>> be3bd1c (Added Email Scheduler and Redis Cloud)
    }
}
