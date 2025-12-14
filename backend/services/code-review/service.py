```python
from flask import Flask, request, jsonify
from .analyzer import analyze_code
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/submit-code', methods=['POST'])
def submit_code():
    try:
        data = request.json
        user_id = data['user_id']
        code = data['code']
        
        # Save to database logic here (pseudo-code)
        submission_id = save_code_submission(user_id, code)
        
        # Enqueue analysis job (pseudo-code)
        enqueue_code_analysis_job(submission_id, code)

        return jsonify({'status': 'success', 'submission_id': submission_id}), 201
    except Exception as e:
        logging.error(f"Error in submit_code: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/review-status/<submission_id>', methods=['GET'])
def review_status(submission_id):
    try:
        # Retrieve status from database (pseudo-code)
        status = get_review_status(submission_id)
        return jsonify({'submission_id': submission_id, 'status': status}), 200
    except Exception as e:
        logging.error(f"Error in review_status: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def save_code_submission(user_id, code):
    # Placeholder for actual database save logic
    return 1  # Mocked submission ID

def enqueue_code_analysis_job(submission_id, code):
    # Placeholder for job enqueue logic
    pass

def get_review_status(submission_id):
    # Placeholder for retrieving status from database
    return 'pending'  # Mocked status
```