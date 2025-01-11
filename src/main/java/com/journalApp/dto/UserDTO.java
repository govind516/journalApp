package com.journalApp.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.index.Indexed;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    @NotEmpty
    @Indexed(unique = true)
    private String userName;
    private String email;
    private boolean sentimentAnalysis;
    @NotEmpty
    private String password;

}
