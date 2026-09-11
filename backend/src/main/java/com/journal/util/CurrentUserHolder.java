package com.journal.util;

import com.journal.exception.ApiException;
import com.journal.model.User;
import org.springframework.http.HttpStatus;

/**
 * Request-scoped holder for the authenticated user, populated by SessionAuthFilter.
 * Uses a ThreadLocal since each HTTP request is handled on its own thread by default
 * in Spring MVC's servlet model.
 */
public final class CurrentUserHolder {

    private static final ThreadLocal<User> CURRENT_USER = new ThreadLocal<>();

    private CurrentUserHolder() {}

    public static void set(User user) {
        CURRENT_USER.set(user);
    }

    public static User get() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
    }

    /** Returns the authenticated user or throws a 401, mirroring FastAPI's get_current_user. */
    public static User requireUser() {
        User user = CURRENT_USER.get();
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "Please sign in to continue");
        }
        return user;
    }
}
