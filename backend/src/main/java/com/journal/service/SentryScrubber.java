package com.journal.service;

import io.sentry.Hint;
import io.sentry.Sentry;
import io.sentry.SentryEvent;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
public class SentryScrubber {

// Short-sensitive values: pin, password; also entry content/tags/mood
    // (length check dropped — recognized field names redact regardless of value)
    private static final Pattern SHORT_VALUE =
            Pattern.compile("(?i)(password|pin|secret|key|token|passphrase|content|tags|mood)\\s*=.+?", Pattern.CASE_INSENSITIVE);

    // Long free-text redaction: content/tags/mood entries over threshold
    // (only as backstop for unstructured text with no recognized field name)
    private static final Pattern LONG_FREE =
            Pattern.compile("(?i)(content|tags|mood)\\s*=[^\\s'\"\n]{24,}", Pattern.CASE_INSENSITIVE);

    public SentryScrubber() {
        // SDK initialized lazily when first used; DSN set via SentryOptions in Spring config
    }

    public static String scrubMessage(String msg) {
        msg = SHORT_VALUE.matcher(msg).replaceAll("$1: *REDACTED");
        msg = LONG_FREE.matcher(msg).replaceAll("$1: *REDACTED");
        return msg;
    }

    // Spring bean method - called on application start to wire beforeSend
    public void scrub() {
        Sentry.init(app -> app
                .setBeforeSend((event, hint) -> beforeSend(event, hint)));
    }

    private static SentryEvent beforeSend(SentryEvent event, Hint hint) {
        event.getBreadcrumbs().forEach(breadcrumb -> {
            String m = breadcrumb.getMessage();
            if (m != null) {
                breadcrumb.setMessage(scrubMessage(m));
            }
        });
        event.getRequest().setQueryString(null);
        event.getUser().setId(null);
        event.getUser().setUsername(null);
        event.getUser().setEmail(null);
        event.getTags().clear();
        event.getTags().put("scrubbed", "true");
        event.getExtras().clear();
        event.getExtras().put("scrubbed", "true");
        event.setTransaction(null);
        event.getFingerprints().clear();
        event.getFingerprints().add("journalapp-scrubbed");
        return event;
    }
}