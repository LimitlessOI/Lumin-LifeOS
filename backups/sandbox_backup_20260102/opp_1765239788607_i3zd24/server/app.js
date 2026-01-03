const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require("child_process");
const mongoose = require('mongoose');
// Import your models and schemas here (if needed)
require('dotenv').config();

const app = express();
app.use(express.json()); // for parsing application/json

const dbConfig = { host: process.env.DB_HOST, port: 27017 };
// Initialize your MongoDB connection here using mongoose with the above config object (dbConfig) and seed data if necessary

mongoose.connect(process.env.MONGODB_URI || dbConfig); // This will connect to a local or cloud database, adjust as needed
const Workflow = require('./models/Workflow');
// ... other required imports...

app.post('/scenario-templates', async (req, res) => {
  const newScenarioTemplateData = JSON.parse(JSON.stringify(req.body)); // Assuming request body is in the correct format for a POST method to create Workflow scenarios from an admin account's data structure
  
  try {
    let scenario_templateID;
    
    if (mongoose.Types.ObjectId.isValid(newScenarioTemplateData.id)) { // If ID is provided, update the workflow template
      const updatedWorkflow = await Workflow.findByIdAndUpdate(newScenarioTemplateData.id, newScenarioTemplateData);
      
      if (updatedWorkflow) res.status(204).send();
   0; } else { // If ID is not provided or invalid: create a new workflow template
            const scenario = await Workflow.create({...newScenarioTemplateData, ...otherProps});  // Replace with correct data structure and properties
      return res.status(201).json(scenario);
    } catch (error) {
        console.log("Error creating workflow template:", error);
        throw new Error('Unable to create the workflow scenario');
    }
  });
});