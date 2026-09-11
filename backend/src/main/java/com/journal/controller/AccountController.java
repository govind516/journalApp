package com.journal.controller;

import com.journal.filter.SessionAuthFilter;
import com.journal.model.User;
import com.journal.service.AuthService;
import com.journal.util.CurrentUserHolder;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    private final AuthService authService;

    public AccountController(AuthService authService) {
        this.authService = authService;
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(HttpServletRequest request, HttpServletResponse response) {
        User user = CurrentUserHolder.requireUser();
        authService.deleteAccount(user.getId());
        Cookie cookie = new Cookie(SessionAuthFilter.SESSION_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }
}
