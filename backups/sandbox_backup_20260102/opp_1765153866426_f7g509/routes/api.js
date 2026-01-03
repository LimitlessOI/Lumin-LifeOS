```javascript
const express = require('express');
const router = express.Router();
// Assume that we have already set up a separate task queue management system and stripe payments are done via Stripe SDK integration elsewhere in the codebase, which is abstracted through this endpoint for creating offers related to tasks: 
router.post('/offers', async (req, res) => {
    try {
        // Validate incoming data based on task requirements and customer_data schema...
        
        const offer = await createOffer(req.body);
        if (!offer || !isValidStatus(offer)) return res.status(400).send('Invalid Offer');
        
        // Assuming we have a function 'createStripeTransaction' that handles Stripe payments and links to the financial transactions table in PostgreSQL: 
        await createStripeTransaction(req, offer);
        
        res.status(201).send('Offer created successfully');
    } catch (error) {
        consolethemes://END FILE===
```
### File Structure Overview for Express Routes: 
- Each microservice will have its own set of routes, typically in a separate `routes` directory within the service folder. This maintains separation and manageability as per your plan's requirement to segregate functionalities like task queue management (`/api/v1/tasks`), offer designing (`/api/v1/offers`).
- All services should implement similar RESTful principles, ensuring a seamless integration of microservices when the system is operational. 

===FILE:models/task_schema.sql===
```sql
-- Tasks table to store all tasks within Make.com with their respective details and statuses (assuming PostgreSQL):
CREATE TABLE IF NOT EXISTS tasks (
    task_id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    priority INTEGER CHECK(priority BETWEEN 1 AND 5), -- Priority levels from low to high for queue management. Assume lower numbers are more urgent/important:
    status VARCHAR(20) DEFAULT 'pending' REFERENCES make_com_offers (offer_id) ON DELETE CASCADE,
    due_date TIMESTAMP NOT NULL CHECK(due_date > NOW()), -- Ensures tasks are future-oriented and have a deadline. 
);