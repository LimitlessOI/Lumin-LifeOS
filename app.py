from flask import Flask, request, jsonify
from transcription_service import analyze_call

app = Flask(__name__)

@app.route('/api/v1/outreach/analyze-call', methods=['POST'])
def analyze_call_endpoint():
    data = request.json
    audio_url = data.get('audio_url')
    if not audio_url:
        return jsonify({'error': 'audio_url is required'}), 400
    analysis_summary = analyze_call(audio_url)
    return jsonify(analysis_summary)

if __name__ == '__main__':
    app.run(debug=True)