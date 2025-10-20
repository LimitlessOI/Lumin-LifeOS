// daily_campaign_scheduler.go

package scheduler

import (
    "time"
    "goVegas/models"
)

func StartDailyCampaign() {
    ticker := time.NewTicker(24 * time.Hour)
    go func() {
        for {
            select {
            case <-ticker.C:
                leads := models.GetLeads()
                // Logic to call 50 leads
            }
        }
    }()
}
