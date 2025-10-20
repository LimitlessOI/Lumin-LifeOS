// outreach.go

package handlers

import (
    "net/http"
    "html/template"
    "goVegas/models"
)

var outreachTemplate = template.Must(template.ParseFiles("templates/dashboard.html"))

func OutreachDashboard(w http.ResponseWriter, r *http.Request) {
    leads := models.GetLeads() // Fetch leads from DB
    outreachTemplate.Execute(w, leads)
}
