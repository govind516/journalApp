package com.journalApp;

import static org.assertj.core.api.Assertions.assertThat;

import com.journalApp.controller.JournalEntryController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class JournalAppApplicationTests {

	@Autowired
	private JournalEntryController journalEntryController;

	@Test
	void contextLoads() {
		assertThat(journalEntryController).isNotNull();
	}

	@Test
	void applicationShouldStartSuccessfully() {
		assertThat(journalEntryController.getClass().getSimpleName()).isEqualTo("JournalEntryController");
	}
}
