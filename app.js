const express = require('express');
const bodyParser = require('body-parser');
const outreachRoutes = require('./routes/outreach');

const app = express();
app.use(bodyParser.json());

app.use('/api/v1/outreach', outreachRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});