import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or 'sqlite:///outreach_leads.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY')