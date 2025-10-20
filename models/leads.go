// leads.go

package models

import (
    "database/sql"
    _ "github.com/lib/pq"
)

var db *sql.DB

func InitDB(dataSourceName string) {
    var err error
    db, err = sql.Open("postgres", dataSourceName)
    if err != nil {
        panic(err)
    }
}

func GetLeads() []Lead {
    rows, err := db.Query("SELECT * FROM outreach_leads")
    if err != nil {
        panic(err)
    }
    defer rows.Close()

    var leads []Lead
    for rows.Next() {
        var lead Lead
        rows.Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Status)
        leads = append(leads, lead)
    }
    return leads
}

type Lead struct {
    ID     int
    Name   string
    Phone  string
    Status string
}
