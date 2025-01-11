package com.journalApp.respository;




import com.journalApp.repositoryImpl.UserRepositoryImpl;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class UserRepositoryImplTest {

    @Autowired
    private UserRepositoryImpl userRepository;

    @Test
    void testSA(){
        Assertions.assertNotNull(userRepository.getUserForSA());
    }
}
