// logger.go

package utils

import (
    "log"
)

func NewLogger() *log.Logger {
    return log.New(os.Stdout, "[GoVegas] ", log.LstdFlags)
}
