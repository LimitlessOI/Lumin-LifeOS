// google_places_service.go

package services

import (
    "net/http"
    "io/ioutil"
    "os"
    "encoding/json"
)

type Place struct {
    Name  string `json:"name"`
    Phone string `json:"formatted_phone_number"`
}

type PlacesResponse struct {
    Results []Place `json:"results"`
}

func FetchLeads() []Place {
    apiKey := os.Getenv("GOOGLE_PLACES_API_KEY")
    url := "https://maps.googleapis.com/maps/api/place/textsearch/json?query=businesses+in+Las+Vegas+Henderson&key=" + apiKey

    resp, err := http.Get(url)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        panic(err)
    }

    var places PlacesResponse
    json.Unmarshal(body, &places)
    return places.Results
}
