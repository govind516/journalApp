package com.journal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequest {
    @Email
    @NotBlank
    private String email;

    @Size(min = 8)
    private String password;

    @NotBlank
    @Size(min = 1, max = 80)
    private String name;

    private String timezone = "UTC";
}
