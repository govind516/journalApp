package com.journal.controller;

import com.journal.dto.LoginRequest;
import com.journal.dto.SignupRequest;
import com.journal.dto.UserResponse;
import com.journal.filter.SessionAuthFilter;
import com.journal.model.User;
import com.journal.service.AuthService;
import com.journal.util.CurrentUserHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int SESSION_MAX_AGE_SECONDS = AuthService.SESSION_DAYS * 24 * 60 * 60;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "Create an account and start a session")
    @ApiResponse(responseCode = "200", description = "Account created")
    @ApiResponse(responseCode = "409", description = "Email already registered")
    @ApiResponse(responseCode = "422", description = "Invalid request")
    @ApiResponse(responseCode = "429", description = "Too many attempts")
    @PostMapping("/signup")
    public UserResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        User user = authService.signup(request);
        setSessionCookie(httpRequest, response, authService.startSession(user.getId()));
        return new UserResponse(user);
    }

    @Operation(summary = "Log in and start a session")
    @ApiResponse(responseCode = "200", description = "Logged in")
    @ApiResponse(responseCode = "401", description = "Email or password not recognised")
    @ApiResponse(responseCode = "429", description = "Too many attempts")
    @PostMapping("/login")
    public UserResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        User user = authService.login(request);
        setSessionCookie(httpRequest, response, authService.startSession(user.getId()));
        return new UserResponse(user);
    }

    @Operation(summary = "Log out and revoke the session")
    @ApiResponse(responseCode = "204", description = "Logged out")
    @PostMapping("/logout")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String token = readCookie(request, SessionAuthFilter.SESSION_COOKIE);
        authService.endSession(token);
        clearSessionCookie(request, response);
    }

    @Operation(summary = "Current authenticated user")
    @ApiResponse(responseCode = "200", description = "Authenticated")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @GetMapping("/me")
    public UserResponse me() {
        return new UserResponse(CurrentUserHolder.requireUser());
    }

    private void setSessionCookie(HttpServletRequest request, HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(SessionAuthFilter.SESSION_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(SESSION_MAX_AGE_SECONDS);
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }

    private void clearSessionCookie(HttpServletRequest request, HttpServletResponse response) {
        Cookie cookie = new Cookie(SessionAuthFilter.SESSION_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }
}
