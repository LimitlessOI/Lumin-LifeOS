// main.go

package main

import (
    "log"
    "net/http"
    "goVegas/config"
    "goVegas/handlers"
    "goVegas/utils"
)

func main() {
    config.LoadConfig()
    logger := utils.NewLogger()

    http.HandleFunc("/overlay/outreach", handlers.OutreachDashboard)
    http.HandleFunc("/outreach/call", handlers.CallHandler)
    http.HandleFunc("/outreach/sms", handlers.SMSHandler)

    logger.Info("Starting server on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        logger.Fatal(err)
    }
}
