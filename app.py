from flask import Flask, request, jsonify
import psycopg2
import os

app = Flask(__name__)

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL)
    return conn

@app.route('/api/v1/vault/ingest', methods=['POST'])
def ingest_conversation():
    data = request.json
    model = data.get('model')
    content = data.get('content')
    context = data.get('context')

    if not model or not content:
        return jsonify({'error': 'Model and content are required.'}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('INSERT INTO ai_vault_conversations (model_name, content, context) VALUES (%s, %s, %s)', (model, content, context))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'message': 'Conversation ingested successfully.'}), 201

if __name__ == '__main__':
    app.run(debug=True)