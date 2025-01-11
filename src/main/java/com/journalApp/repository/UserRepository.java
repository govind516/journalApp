package com.journalApp.repository;

import com.journalApp.entity.User;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, ObjectId> {
    User findByUserName(String username);

    void deleteByUserName(String name);

    Optional<User> findByEmail(String email);
}

// Controller --> Service --> Repository