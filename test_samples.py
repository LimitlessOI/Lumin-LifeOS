import requests

def test_analyze_call():
    sample_recordings = [
        'http://example.com/sample1.wav',
        'http://example.com/sample2.wav',
        'http://example.com/sample3.wav'
    ]
    for recording in sample_recordings:
        response = requests.post('http://localhost:5000/api/v1/outreach/analyze-call', json={'recording_url': recording})
        print(response.json())