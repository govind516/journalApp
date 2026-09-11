package com.journal.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EntryImportParserTest {

    @Test
    void markdownSplitsOnDatedHeadings() {
        var parsed = EntryImportParser.parse("markdown",
                "# 2026-09-09\n\nMorning light. #grateful\n\n## 2026-09-08\n\nRain all day.\n");
        assertEquals(2, parsed.entries().size());
        assertEquals("2026-09-09", parsed.entries().get(0).date());
        assertTrue(parsed.entries().get(0).tags().contains("grateful"));
        assertTrue(parsed.errors().isEmpty());
    }

    @Test
    void markdownWithoutHeadingsExplainsItself() {
        var parsed = EntryImportParser.parse("markdown", "just some words");
        assertTrue(parsed.entries().isEmpty());
        assertFalse(parsed.errors().isEmpty());
    }

    @Test
    void jsonRoundTripKeepsValidMoodsOnly() {
        var parsed = EntryImportParser.parse("json",
                "[{\"date\":\"2026-09-09\",\"content\":\"hi\",\"mood\":\"calm\",\"tags\":[\"a\"]}," +
                "{\"date\":\"2026-09-08\",\"content\":\"yo\",\"mood\":\"ecstatic\",\"tags\":[]}," +
                "{\"date\":\"nope\",\"content\":\"bad\"}]");
        assertEquals(2, parsed.entries().size());
        assertEquals("calm", parsed.entries().get(0).mood());
        assertNull(parsed.entries().get(1).mood());
        assertEquals(1, parsed.errors().size());
    }

    @Test
    void csvHandlesQuotesCommasAndMultiline() {
        var parsed = EntryImportParser.parse("csv",
                "date,content,mood,tags\n" +
                "2026-09-09,\"Hello, world\",calm,\"morning; tea\"\n" +
                "2026-09-08,\"Line one\nline two\",,work\n" +
                "bad-date,x,,\n");
        assertEquals(2, parsed.entries().size());
        assertEquals("Hello, world", parsed.entries().get(0).content());
        assertEquals(List.of("morning", "tea"), parsed.entries().get(0).tags());
        assertTrue(parsed.entries().get(1).content().contains("line two"));
        assertEquals(1, parsed.errors().size());
    }

    @Test
    void dayOneReadsCreationDatesAndTags() {
        var parsed = EntryImportParser.parse("dayone",
                "{\"entries\":[{\"creationDate\":\"2026-09-09T07:00:00Z\",\"text\":\"Day one text\",\"tags\":[\"Travel\"]}," +
                "{\"creationDate\":\"broken\",\"text\":\"skipped\"}]}");
        assertEquals(1, parsed.entries().size());
        assertEquals("2026-09-09", parsed.entries().get(0).date());
        assertEquals(List.of("travel"), parsed.entries().get(0).tags());
        assertEquals(1, parsed.errors().size());
    }

    @Test
    void unknownFormatIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> EntryImportParser.parse("xml", "<x/>"));
    }
}
