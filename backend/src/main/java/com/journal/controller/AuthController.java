package com.journal.controller;

import com.journal.dto.LoginRequest;
import com.journal.dto.SignupRequest;
import com.journal.dto.UserResponse;
import com.journal.filter.SessionAuthFilter;
import com.journal.model.User;
import com.journal.service.AuthService;
import com.journal.util.CurrentUserHolder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final int SESSION_MAX_AGE_SECONDS = AuthService.SESSION_DAYS * 24 * 60 * 60;

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public UserResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        User user = authService.signup(request);
        setSessionCookie(httpRequest, response, authService.startSession(user.getId()));
        return new UserResponse(user);
    }

    @PostMapping("/login")
    public UserResponse login(@RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        User user = authService.login(request);
        setSessionCookie(httpRequest, response, authService.startSession(user.getId()));
        return new UserResponse(user);
    }

    @PostMapping("/logout")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String token = readCookie(request, SessionAuthFilter.SESSION_COOKIE);
        authService.endSession(token);
        clearSessionCookie(request, response);
    }

    @GetMapping("/me")
    public UserResponse me() {
        return new UserResponse(CurrentUserHolder.requireUser());
    }

    private void setSessionCookie(HttpServletRequest request, HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(SessionAuthFilter.SESSION_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(SESSION_MAX_AGE_SECONDS);
        // Secure only over HTTPS so localhost development keeps working.
        cookie.setSecure(request.isSecure());
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private void clearSessionCookie(HttpServletRequest request, HttpServletResponse response) {
        Cookie cookie = new Cookie(SessionAuthFilter.SESSION_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setSecure(request.isSecure());
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
