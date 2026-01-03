const express = require('express');
require('dotenv').config();
// Other imports...

async function startServer() {
  const app = express();
  
  // Routes setup (Express routes) here

  await createDatabaseAsync();

  if(process.env.NODE_ENV !== 'production'){
    require('./routes');
  } else {
    console.error("Running in development mode");
  }
  
  app.listen((process.env.PORT || 5000), () => {
    console.log(`Listening on port ${process.env.PORT}`);
  });
}

startServer();