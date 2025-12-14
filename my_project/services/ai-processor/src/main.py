```python
from flask import Flask, request, jsonify
from workflow_analyzer import analyze_workflow

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    result = analyze_workflow(data)
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5001)
```