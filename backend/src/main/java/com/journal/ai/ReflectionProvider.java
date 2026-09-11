package com.journal.ai;

import com.journal.dto.AskResponse;
import com.journal.model.User;

/**
 * Provider seam for journal intelligence. The shipped implementation reads
 * only the user's own entries on this machine; a future cloud or Ollama
 * provider implements this same interface and answers get labeled
 * accordingly — no UI or API redesign needed.
 */
public interface ReflectionProvider {

    /** Provider id exposed as {@code source} in responses, e.g. "local". */
    String name();

    AskResponse answer(User user, String question);
}
