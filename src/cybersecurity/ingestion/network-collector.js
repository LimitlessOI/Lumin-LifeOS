const express = require('express');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle JSON data
app.use(express.json());

// Transform stream to normalize network data
class NormalizeDataStream extends Transform {
  constructor(options) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    try {
      const data = JSON.parse(chunk);
      // Normalize data
      const normalizedData = {
        sourceIP: data.src_ip,
        destinationIP: data.dst_ip,
        protocol: data.protocol,
        timestamp: new Date(data.timestamp),
        bytesTransferred: data.bytes,
      };
      this.push(JSON.stringify(normalizedData));
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

// Endpoint to receive network traffic data
app.post('/ingest', (req, res) => {
  const transformStream = new NormalizeDataStream();
  req.pipe(transformStream).pipe(fs.createWriteStream(path.join(__dirname, 'network-data.log'), { flags: 'a' }));

  transformStream.on('finish', () => {
    res.status(200).send('Data ingested successfully');
  });

  transformStream.on('error', (err) => {
    console.error('Error processing data:', err);
    res.status(500).send('Internal Server Error');
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Network Collector Service running on port ${PORT}`);
});