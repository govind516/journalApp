package com.journal.controller;

import com.journal.dto.ImportRequest;
import com.journal.dto.ImportResponse;
import com.journal.exception.ApiException;
import com.journal.model.User;
import com.journal.service.ImportService;
import com.journal.util.CurrentUserHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Base64;

/**
 * Imports arrive as JSON ({filename, format, contentBase64}) rather than
 * multipart: identical behavior in every client, no multipart size-limit
 * configuration to drift, and trivially mockable in tests.
 */
@RestController
@RequestMapping("/api/import")
public class ImportController {

    private final ImportService importService;

    public ImportController(ImportService importService) {
        this.importService = importService;
    }

    @PostMapping
    public ImportResponse importFile(@RequestBody ImportRequest request) {
        User user = CurrentUserHolder.requireUser();
        String resolved = request.getFormat() != null && !request.getFormat().isBlank()
                ? request.getFormat()
                : formatFromName(request.getFilename());
        byte[] bytes;
        try {
            bytes = request.getContentBase64() == null ? new byte[0]
                    : Base64.getDecoder().decode(request.getContentBase64());
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "The file content is not valid base64");
        }
        return importService.importFile(user, resolved, bytes);
    }

    private String formatFromName(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(java.util.Locale.ROOT);
        return switch (ext) {
            case "md", "markdown", "txt" -> "markdown";
            case "json" -> "json";
            case "csv" -> "csv";
            default -> ext;
        };
    }
}
