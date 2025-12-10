```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type SensorReading struct {
    SensorID string  `json:"sensor_id"`
    Value    float64 `json:"value"`
    Timestamp string `json:"timestamp"`
}

func main() {
    http.HandleFunc("/ingest", func(w http.ResponseWriter, r *http.Request) {
        var reading SensorReading
        err := json.NewDecoder(r.Body).Decode(&reading)
        if err != nil {
            http.Error(w, err.Error(), http.StatusBadRequest)
            return
        }

        log.Printf("Received sensor reading: %+v", reading)
        w.WriteHeader(http.StatusOK)
    })

    log.Println("IoT Gateway Service is running on port 8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```