// Express routes for controlling temperature settings and collecting data (Express.js)
const express = require('express');
const router = express();
router.get('/temperature', async function(req, res){
  const { temp } = req.query; // get temperature from request query string in degrees Celsius
  
  try{
    await setTemperature(temp); // Controls the heating system for setting mantle model's temperature to desired value while ensuring safety limits are not exceeded
    res.send({message: 'Temperature adjusted successfully.'});
  } catch (error){
      console.log('Error in Temperature setup', error);
      res.status(500).send('An internal server error occurred');
  }    
})
// ... additional routes and logic to handle seismic wave data collection...