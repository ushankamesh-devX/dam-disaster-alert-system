package com.ddas.api.controller;

import com.ddas.api.exception.GlobalExceptionHandler;
import com.ddas.api.service.AiRagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiRagControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AiRagService aiRagService;

    @InjectMocks
    private AiRagController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void chat_returnsSuccess() throws Exception {
        when(aiRagService.chat(any())).thenReturn(Map.of(
                "query", "What is the emergency gate protocol?",
                "answer", "Open spillway gates in 0.5m increments.",
                "sources", List.of()
        ));

        mockMvc.perform(post("/api/v1/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\": \"What is the emergency gate protocol?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.query").value("What is the emergency gate protocol?"))
                .andExpect(jsonPath("$.data.answer").value("Open spillway gates in 0.5m increments."));
    }

    @Test
    void indexDocument_returnsCreated() throws Exception {
        when(aiRagService.indexDocument(any())).thenReturn(Map.of("doc_id", "doc_101", "version", 1));

        mockMvc.perform(post("/api/v1/admin/ai/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\": \"Victoria EAP\", \"category\": \"sop\", \"content\": \"Sample procedures\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.doc_id").value("doc_101"))
                .andExpect(jsonPath("$.data.version").value(1));
    }

    @Test
    void listDocuments_returnsList() throws Exception {
        when(aiRagService.listDocuments(any(), any())).thenReturn(List.of(Map.of("doc_id", "doc_101")));

        mockMvc.perform(get("/api/v1/admin/ai/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].doc_id").value("doc_101"));
    }

    @Test
    void deleteDocument_returnsSuccess() throws Exception {
        when(aiRagService.deleteDocument(eq("doc_101"))).thenReturn(Map.of("status", "deactivated"));

        mockMvc.perform(delete("/api/v1/admin/ai/documents/doc_101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("deactivated"));
    }
}

