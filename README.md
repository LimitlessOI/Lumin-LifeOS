# Las Vegas Business Lead Collector

## Overview
This project is a Flask application that collects business leads from the Google Places API for specified cities and categories.

## Setup
1. Clone the repository.
2. Create a `.env` file and add your Google Places API key:
   `GOOGLE_PLACES_API_KEY=your_api_key`
3. Set up your database by configuring `DATABASE_URL` in the `.env` file.
4. Install the required packages using `pip install -r requirements.txt`.
5. Run the application with `python app.py`.

## API Endpoint
### POST /api/v1/outreach/collect-leads
- **Parameters:**
  - `city`: City name (Las Vegas or Henderson)
  - `category`: Business category to search for
  - `limit`: Number of leads to collect (default is 10)
- **Response:** Returns the count of leads collected.