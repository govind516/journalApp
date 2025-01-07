package com.journalApp.api.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

import java.util.List;

@Getter
public class WeatherResponse {

    private Current current;

    @Getter
    public static class Current{

        private int temprature;

        @JsonProperty("weather_descriptions")
        private List<String> weatherDescriptions;

        private int feelslike;
    }
}
