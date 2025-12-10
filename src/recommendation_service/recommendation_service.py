from flask import Flask, request, jsonify
from recommendation_engine import generate_recommendations

app = Flask(__name__)

@app.route('/recommendations', methods=['GET'])
def recommendations():
    user_id = request.args.get('user_id')
    recommendations = generate_recommendations(user_id)
    return jsonify(recommendations)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)