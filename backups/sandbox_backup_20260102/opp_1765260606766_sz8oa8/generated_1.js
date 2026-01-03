# routes/create_user.py
from flask import request, jsonify, make_response
import requests
from werkzeug.security import generate_password_hash
from models import User # Assume we have a model-like structure for our mock user data in 'models' module not provided here

@app.route('/api/user', methods=['POST'])
def create_new_user():
    try:
        json = request.get_json() 
        
        # Validate input and ensure required fields are present, which can be done in the 'models' module or using a schema validation library like Marshmallow-AutoSchema if needed
        name = json['name']
        email = json['email']
        password = generate_password_hash(json['password']) # Using bcrypt for hashing passwords, but keep it simple here
        
        newUser = User.query.filter_by(email=email).first() 
        if not newUser:
            userData = { 'name': name, 'username': email }   
            
            db.session.add(newUser) # Assuming we're using SQLAlch0m or a similar ORM for database interaction (not provided in this example)...
            db.session.commit()
            return jsonify({"message": "New user created"}), 201, {"Location": url_for('getUser', id=newUser.id)} # Assuming we have an 'url_for' function to handle URL slugs for the newly added resource (not provided here)
        
        return jsonify(userData), 409, {'Content-Type': 'application/json'}
    except Exception as e:
        print("An error occurred.")