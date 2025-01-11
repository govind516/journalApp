package com.journalApp.controller;

import com.journalApp.api.response.QuoteResponse;
import com.journalApp.api.response.WeatherResponse;
import com.journalApp.dto.UserDTO;
import com.journalApp.entity.User;
import com.journalApp.repository.UserRepository;
import com.journalApp.service.QuoteService;
import com.journalApp.service.UserService;
import com.journalApp.service.WeatherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
@Tag(name = "2. User APIs", description = "Update, Delete and Greetings")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuoteService quoteService;

    @Autowired
    private WeatherService weatherService;

    @PutMapping()
    @Operation(summary = "Update User")
    public ResponseEntity<Void> updateUser(@RequestBody UserDTO user){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userName = authentication.getName();
        User userInDb = userService.findByUserName(userName);
        userInDb.setUserName(user.getUserName());
        userInDb.setPassword(user.getPassword());
        userService.saveNewUser(userInDb);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT) ;
    }

    @DeleteMapping()
    @Operation(summary = "Delete User by ID")
    public ResponseEntity<Void> deleteUserById (){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        userRepository.deleteByUserName(authentication.getName());
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @GetMapping()
    @Operation(summary = "User Greetings")
    public ResponseEntity<String> greeting (){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        WeatherResponse weatherResponse = weatherService.getWeather("Mumbai");
        List<QuoteResponse> quoteResponse = quoteService.getQuote();
        String quote = "";
        String weather = "";

        if(weatherResponse != null){
            weather = "\nWeather feels like " + weatherResponse.getCurrent().getFeelslike();
        }
        if(quoteResponse != null && !quoteResponse.isEmpty()){
            quote = "\nToday's Quote : " +  quoteResponse.getFirst().getQuote();
        }
        return new ResponseEntity<>("Hi " + authentication.getName() + weather + quote, HttpStatus.OK);
    }
}

// Controller --> Service --> Repository
