const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');
const config = require('./config/config');

const app = express();
app.use(bodyParser.json());

app.use('/api/v1/outreach', apiRoutes);

const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});