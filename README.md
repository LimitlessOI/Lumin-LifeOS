# Las Vegas Business Lead Collector

## Description
This application collects business leads for Las Vegas. It can generate mock data for testing if the GOOGLE_PLACES_API_KEY is not provided.

## Setup
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Set your environment variable `GOOGLE_PLACES_API_KEY` in a `.env` file.
4. Run the application with `node app.js`.

## API Endpoint
- `POST /api/v1/outreach/collect-leads`

## Note
If you see a message indicating that mock data is being used, please set the `GOOGLE_PLACES_API_KEY` in your environment variables for real leads.