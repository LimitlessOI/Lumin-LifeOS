const express = require('express');
   const bodyParser = require('body-parser'); // Body parser to parse incoming POST data in JSON format easily. 
   
   const app = express();
   app.use(bodyParser.json());
   
   // GET /api/v1/products - Fetch all products or a specific one by id:
   app.get('/api/v1/products', async (req, res) => {
       try {
           const response = await fetchProducts();
           res.json(response);
       } catch (error) {
           console0;res.status(500).send("Internal Server Error");
       }
   });
   
   // POST /api/v1/orders - Create a new order with product details and customer information:
   app.post('/api/v1/orders', async (req, res) => {
       try {
           const createdOrder = await createOrder(req.body);
           res.status(201).json(createdOrder);
       } catch (error) {
           res.status(400).send("Bad Request");
       }
   });
   
   // PUT /api/v1/order_details - Update order status: 'pending', 'in-progress' or 'completed':
   app.put('/api/v1/order_details/:id', async (req, res) => {
       try {
           const updatedStatus = await updateOrderDetails(req.params.id, req.body);
           if (!updatedStatus) throw new Error("Invalid status");  // Ensure the received data is valid for our application context before proceeding with updates: it's a security best practice to prevent unauthorized or incorrect data manipulation on endpoints which could lead to inconsistencies in real-time analytics.
           res.status(200).send(`Order status updated successfully`);
       } catch (error) {
           res.status(400).send("Bad Request");  // Handle unexpected errors like invalid data or system issues during the update process: it's a common practice in robust API design to handle potential exceptions and communicate back proper error responses for troubleshooting purposes along with analytics logs captured by Sidecar caching pattern alongside our database systems.
       }
   });
   
   // POST /api/v1/self-program - Trigger the AI module: This endpoint would interact directly or indirectly (through a job queue) to trigger an automated process that analyzes customer data, updates predictive models and potentially triggers other backend tasks as needed. The integration of machine learning algorithms can be abstracted within this function which will handle incoming requests by processing them through the AI module:
   app.post('/api/v1/self-program', async (req, res) => {
       try {
           await triggerAIModel(req.body); // This is a placeholder for an actual asynchronous call to your self-learning AI model and task queue system setup with RabbitMQ or Kafka as queuing mechanisms: this can be designed using Node's child_process module, Python subprocess management library in case of more complex scripts outside the scope here.
           res.status(201).send("AI processing initiated successfully");  // Indicating to the client that their request has been received and will commence soon - this might involve real-time analytics updates via Redis caching using Sidecar pattern as well if needed for immediate visibility: Neon PostgreSQL, with appropriate indexes on customer data fields like email address can be used efficiently along with Stripe API integration to ensure seamless checkout processes.
       } catch (error) {
           res.status(500).send("Internal Server Error");  // Handle unexpected errors that occur during the triggering of AI tasks: this could include issues like failed job queue processing or exceptions within your machine learning models which need to be addressed immediately for maintaining service availability and consistent performance analytics on our system.
       }
   });
   
4. **Frontend Components** - Note that actual front-end code would require frameworks such as React Native, Vue.js etc., along with Redux or Context API (React) to manage global state: