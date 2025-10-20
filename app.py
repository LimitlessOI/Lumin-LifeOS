from flask import Flask, request, jsonify
from transcription_service import analyze_call

app = Flask(__name__)

@app.route('/api/v1/outreach/analyze-call', methods=['POST'])
def analyze_call_endpoint():
    data = request.json
    recording_url = data.get('recording_url')
    if not recording_url:
        return jsonify({'error': 'Recording URL is required'}), 400

    analysis_summary = analyze_call(recording_url)
    return jsonify(analysis_summary)

if __name__ == '__main__':
    app.run(debug=True)