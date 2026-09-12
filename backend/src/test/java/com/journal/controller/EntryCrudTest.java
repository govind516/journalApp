package com.journal.controller;

import com.journal.PostgresIntegrationTest;
import com.journal.model.User;
import com.journal.repository.UserRepository;
import com.journal.service.AuthService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Entry CRUD through the real controller + Postgres stack. Auth is set up
 * directly (repository + session) so these tests never touch the auth rate
 * limiter; ownership and validation go through the actual HTTP layer.
 */
class EntryCrudTest extends PostgresIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private AuthService auth;

    private Cookie login(String email) {
        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(email);
        user.setName("Crud");
        user.setPasswordHash("test-hash");
        user.setCreatedAt(Instant.now());
        users.save(user);
        return new Cookie("journal_session", auth.startSession(user.getId()));
    }

    private static String entryJson(String date, String content, String mood) {
        return "{\"date\":\"" + date + "\",\"content\":\"" + content + "\",\"mood\":\""
                + mood + "\",\"tags\":[\"evening\"],\"backfilled\":false}";
    }

    @Test
    void createPersistsAndReadsBack() throws Exception {
        Cookie session = login("crud-create@example.com");

        MvcResult created = mvc.perform(put("/api/entries/date/2026-09-01")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-01", "First light.", "calm")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-09-01"))
                .andExpect(jsonPath("$.content").value("First light."))
                .andExpect(jsonPath("$.mood").value("calm"))
                .andReturn();
        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/entries/date/2026-09-01").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));
    }

    @Test
    void listShowsOnlyOwnEntries() throws Exception {
        Cookie mine = login("crud-list-mine@example.com");
        Cookie other = login("crud-list-other@example.com");

        mvc.perform(put("/api/entries/date/2026-09-02")
                        .cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-02", "Not yours.", "calm")))
                .andExpect(status().isOk());
        mvc.perform(put("/api/entries/date/2026-09-03")
                        .cookie(mine)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-03", "Mine.", "calm")))
                .andExpect(status().isOk());

        mvc.perform(get("/api/entries").cookie(mine))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].content").value("Mine."));
    }

    @Test
    void cannotReadAnotherUsersEntryById() throws Exception {
        Cookie other = login("crud-read-other@example.com");
        Cookie mine = login("crud-read-mine@example.com");

        MvcResult created = mvc.perform(put("/api/entries/date/2026-09-04")
                        .cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-04", "Private.", "calm")))
                .andExpect(status().isOk())
                .andReturn();
        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(get("/api/entries/" + id).cookie(mine))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Entry not found"));
    }

    @Test
    void updatePersistsChangeOnSameRow() throws Exception {
        Cookie session = login("crud-update@example.com");

        MvcResult created = mvc.perform(put("/api/entries/date/2026-09-05")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-05", "Draft.", "calm")))
                .andExpect(status().isOk())
                .andReturn();
        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(put("/api/entries/date/2026-09-05")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-05", "Revised.", "grateful")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.content").value("Revised."))
                .andExpect(jsonPath("$.mood").value("grateful"));
    }

    @Test
    void dateUpsertCannotTouchAnotherUsersRow() throws Exception {
        Cookie other = login("crud-upsert-other@example.com");
        Cookie mine = login("crud-upsert-mine@example.com");

        mvc.perform(put("/api/entries/date/2026-09-06")
                        .cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-06", "Theirs.", "calm")))
                .andExpect(status().isOk());

        // Same calendar date from another account creates a separate row.
        mvc.perform(put("/api/entries/date/2026-09-06")
                        .cookie(mine)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-06", "Mine.", "calm")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Mine."));

        mvc.perform(get("/api/entries/date/2026-09-06").cookie(other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Theirs."));
    }

    @Test
    void deleteRemovesEntry() throws Exception {
        Cookie session = login("crud-delete@example.com");

        MvcResult created = mvc.perform(put("/api/entries/date/2026-09-07")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-07", "Ephemeral.", "calm")))
                .andExpect(status().isOk())
                .andReturn();
        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(delete("/api/entries/" + id).cookie(session)).andExpect(status().isNoContent());
        mvc.perform(get("/api/entries/" + id).cookie(session)).andExpect(status().isNotFound());
    }

    @Test
    void cannotDeleteAnotherUsersEntry() throws Exception {
        Cookie other = login("crud-del-other@example.com");
        Cookie mine = login("crud-del-mine@example.com");

        MvcResult created = mvc.perform(put("/api/entries/date/2026-09-08")
                        .cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-08", "Untouchable.", "calm")))
                .andExpect(status().isOk())
                .andReturn();
        String id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mvc.perform(delete("/api/entries/" + id).cookie(mine)).andExpect(status().isNotFound());
        mvc.perform(get("/api/entries/" + id).cookie(other)).andExpect(status().isOk());
    }

    @Test
    void validationFailuresMapTo4xx() throws Exception {
        Cookie session = login("crud-validation@example.com");

        // Body date must match the URL date.
        mvc.perform(put("/api/entries/date/2026-09-09")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-10", "Mismatch.", "calm")))
                .andExpect(status().isBadRequest());

        // Calendar dates must be real YYYY-MM-DD.
        mvc.perform(put("/api/entries/date/not-a-date")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("not-a-date", "Nope.", "calm")))
                .andExpect(status().isUnprocessableEntity());

        // Moods come from a fixed set.
        mvc.perform(put("/api/entries/date/2026-09-09")
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryJson("2026-09-09", "Odd.", "ecstatic")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void entryIdsAreUnpredictablePerUser() throws Exception {
        Cookie first = login("crud-ids-a@example.com");
        Cookie second = login("crud-ids-b@example.com");

        String one = com.jayway.jsonpath.JsonPath.read(
                mvc.perform(put("/api/entries/date/2026-09-11")
                                .cookie(first)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(entryJson("2026-09-11", "One.", "calm")))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.id");
        String two = com.jayway.jsonpath.JsonPath.read(
                mvc.perform(put("/api/entries/date/2026-09-11")
                                .cookie(second)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(entryJson("2026-09-11", "Two.", "calm")))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.id");
        assertNotEquals(one, two);
    }
}
