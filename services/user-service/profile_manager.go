```go
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/lib/pq"
)

type UserProfile struct {
	UserID     int             `json:"user_id"`
	Preferences map[string]interface{} `json:"preferences"`
}

var db *sql.DB

func init() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
}

func getUserProfile(w http.ResponseWriter, r *http.Request) {
	userId := r.URL.Query().Get("user_id")
	var userProfile UserProfile

	err := db.QueryRow("SELECT user_id, preferences FROM learning_profiles WHERE user_id = $1", userId).Scan(&userProfile.UserID, &userProfile.Preferences)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(userProfile)
}

func updateUserProfile(w http.ResponseWriter, r *http.Request) {
	var userProfile UserProfile
	err := json.NewDecoder(r.Body).Decode(&userProfile)
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	_, err = db.Exec("UPDATE learning_profiles SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2", userProfile.Preferences, userProfile.UserID)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func main() {
	http.HandleFunc("/get-profile", getUserProfile)
	http.HandleFunc("/update-profile", updateUserProfile)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("User Service running on port %s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
```