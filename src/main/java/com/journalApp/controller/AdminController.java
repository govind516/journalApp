package com.journalApp.controller;

import com.journalApp.cache.AppCache;
import com.journalApp.dto.UserDTO;
import com.journalApp.entity.User;
import com.journalApp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@Tag(name = "4. Admin APIs", description = "Create Admin, View All Users")
public class AdminController {

    @Autowired
    private UserService userService;

    @Autowired
    private AppCache appCache;

    @GetMapping("/all-users")
    @Operation(summary = "Get All Users")
    public ResponseEntity<List<User>> getAllUser(){
        List<User> all = userService.getAll();
        if(all != null && !all.isEmpty()){
            return new ResponseEntity<>(all, HttpStatus.OK);
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PostMapping("/create-admin")
    @Operation(summary = "Create Admin")
    public void createAdmin(@RequestBody UserDTO user){
        User adminDTO = new User();
        adminDTO.setUserName(user.getUserName());
        adminDTO.setPassword(user.getPassword());
        adminDTO.setEmail(user.getEmail());
        adminDTO.setSentimentAnalysis(user.isSentimentAnalysis());
        userService.saveAdmin(adminDTO);
    }

    @GetMapping("/clear-app-cache")
    @Operation(summary = "Clear App Cache")
    public void clearAppCache(){
        appCache.init();
    }
}
