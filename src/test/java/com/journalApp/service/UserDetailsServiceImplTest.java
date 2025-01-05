package com.journalApp.service;

import com.journalApp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import com.journalApp.entity.User;
import org.mockito.ArgumentMatchers;
import static org.mockito.Mockito.when;
import org.junit.jupiter.api.Assertions;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.ArrayList;

//@SpringBootTest
public class UserDetailsServiceImplTest {

//    @Autowired
//    private UserDetailsServiceImpl userDetailsServiceImpl;
//
//    @MockitoBean
//    private UserService userService;

    @InjectMocks
    private UserDetailsServiceImpl userDetailsServiceImpl;

    @Mock
    private UserRepository userRepository;

    @BeforeEach
    @Disabled
    void setUp(){
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @Disabled
    void loadUserByUsernameTest(){
        when(userRepository.findByUserName(ArgumentMatchers.anyString())).thenReturn(User.builder().userName("Ram").password("Ram").roles(new ArrayList<>()).build());
        UserDetails user = userDetailsServiceImpl.loadUserByUsername("Ram");
        Assertions.assertNotNull(user);
    }
}
