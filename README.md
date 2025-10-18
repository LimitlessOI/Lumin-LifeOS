# AI Sales Coach for Live Calls

## Description
This project implements an AI Sales Coach that analyzes call transcripts in real-time using GPT-4, providing coaching tips via WebSocket.

## Setup
1. Install dependencies: `npm install express body-parser mongoose ws openai`
2. Configure your database connection in `database.js`
3. Start the server: `node server.js`

## API Endpoints
- `POST /api/v1/sales/coach`: Receives call transcripts and provides coaching tips.

## WebSocket
The server establishes a WebSocket connection to send real-time coaching tips.

## Test Cases
See `sampleCalls.js` for sample call scenarios.