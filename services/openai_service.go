// openai_service.go

package services

import (
    "net/http"
    "encoding/json"
    "os"
)

type OpenAIRequest struct {
    Prompt string `json:"prompt"`
    MaxTokens int `json:"max_tokens"`
}

type OpenAIResponse struct {
    Choices []struct {
        Text string `json:"text"`
    } `json:"choices"`
}

func TranscribeAndGenerateTasks(transcript string) string {
    apiKey := os.Getenv("OPENAI_API_KEY")
    reqBody := OpenAIRequest{Prompt: transcript, MaxTokens: 150}
    // Call OpenAI API and handle response
    return "Generated tasks"
}
