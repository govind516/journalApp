# ADR-004: Remove dead HttpServletRequest params from auth controllers (proposed, deferred)

* Status: proposed (not actioned)
* Date: 2026-09-12

## Context

The cookie-hardening change (profile-driven `Secure`/`SameSite`) removed the only use of the servlet request in several cookie call sites — `request.isSecure()` was replaced by injected properties. Left behind, verified still present:

* `AuthController.signup` / `login`: `httpRequest` param now unused (only forwarded to `setSessionCookie`).
* `AuthController.setSessionCookie` / `clearSessionCookie`: `request` param now unused.
* `AccountController.deleteAccount`: `request` param now unused, leaving its `HttpServletRequest` import unused as well.

Still genuinely used and out of scope: `logout`'s `request` (via `readCookie`) and `readCookie` itself.

## Decision

None yet — cleanup deferred pending an explicit go-ahead. The params are harmless (no behavior, no warnings-as-errors), so this waits behind real work rather than consuming a review cycle now.

## Consequences (if actioned)

* `+` Removes five dead params and one dead import; no behavior change (Spring MVC binds only declared params).
* `-` Touches two controllers' signatures for cosmetic gain — trivially reviewable, but churn all the same.

## Revisit when

The next functional change touches `AuthController` or `AccountController` — fold the removal into that diff rather than shipping a cleanup-only commit.
