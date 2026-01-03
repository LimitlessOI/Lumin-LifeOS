BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS PerformanceMetrics (
    ServiceName VARCHAR(100) UNIQUE, -- Assuming unique services offered by the business to track performance metrics accurately for each one individually or as a generic service if required within this schema design context.
    RequestLatency INTEGER CHECK (RequestLatency > 0),
    ErrorRate FLOAT DEFAULT 0 CONSTRAINT error_rate_positive NOT NULL, -- Positive integer representing percentage rate of errors encountered for the system's request handling performance metric indicating less than zero or null values would be non-sensical and possibly harmful to track. Hence not allowed in this schema design context as per provided instructions (0 means no errors).
    CONSTRAINT unique_performance_metric UNIQUE(ServiceName) -- Assuming one service might have multiple metrics, hence a composite primary key with RequestLatency would be ideal but for simplicity assumed here. 
);
COMMIT;