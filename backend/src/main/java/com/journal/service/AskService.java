package com.journal.service;

import com.journal.ai.ReflectionProvider;
import com.journal.dto.AskResponse;
import com.journal.exception.ApiException;
import com.journal.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Selects the configured reflection provider. Only "local" ships today;
 * cloud or Ollama providers plug in here behind app.ai.provider.
 */
@Service
public class AskService {

    private final List<ReflectionProvider> providers;

    @Value("${app.ai.provider:local}")
    private String configured;

    public AskService(List<ReflectionProvider> providers) {
        this.providers = providers;
    }

    public AskResponse ask(User user, String rawQuestion) {
        String question = rawQuestion == null ? "" : rawQuestion.strip();
        if (question.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Ask something first — a question, a word, anything.");
        }
        if (question.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Keep the question under 500 characters.");
        }
        ReflectionProvider provider = providers.stream()
                .filter(p -> p.name().equalsIgnoreCase(configured))
                .findFirst()
                .orElse(providers.stream().findFirst()
                        .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE.value(), "No reflection provider is available.")));
        return provider.answer(user, question);
    }

    public String providerName() {
        return configured;
    }
}
