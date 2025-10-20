from flask import Flask, request, jsonify
from models import db, OutreachLead
from config import Config
import requests
import os

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

@app.route('/api/v1/outreach/collect-leads', methods=['POST'])
def collect_leads():
    data = request.json
    city = data.get('city')
    category = data.get('category')
    limit = data.get('limit', 10)

    if city not in ['Las Vegas', 'Henderson']:
        return jsonify({'error': 'Invalid city. Must be Las Vegas or Henderson.'}), 400

    # Call Google Places API
    api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    url = f'https://maps.googleapis.com/maps/api/place/textsearch/json?query={category}+in+{city}&key={api_key}&limit={limit}'
    response = requests.get(url)
    results = response.json().get('results', [])

    count = 0
    for result in results:
        lead = OutreachLead(
            name=result.get('name'),
            phone=result.get('formatted_phone_number', 'N/A'),
            email='N/A',  # Placeholder as Google Places API does not provide email
            address=result.get('formatted_address', 'N/A'),
            category=category,
            url=result.get('url', 'N/A'),
            status='new'
        )
        db.session.add(lead)
        count += 1

    db.session.commit()
    return jsonify({'count': count}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)