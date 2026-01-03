from flask import Flask, request, jsonify
import stripe
from decouple import config
stripe_keys = config('STRIPE_TEST_SECRET', raise_if_missing=True)
stripe.api_key = stripe_keys['secret']  # Use test secret for development purposes. Replace with live keys in production.

app = Flask(__name__)
# Stripe webhook listeners setup here, using the 'requests' and 'flask-webhooks' libraries if needed... (omitted due to length constraints).

@app.route('/api/v1/orders', methods=['GET', 'POST'])
def handle_order():
    # Authentication handling logic goes here... 
    
    if request.method == 'POST':
        new_order = stripe.Charge.create(amount=int('insert amount'), currency='usd')
        return jsonify({'status': 'success', 'message': 'Order processed successfully.'}), 201
        
@app.route('/api/v1/stripe-payment/process', methods=['POST'])
def process_payment():
    # Authenticate and validate request data... (omitted for brevity)
    
    payment = stripe.PaymentIntent.create(amount=int('insert amount'), currency='usd', ... )  # Other required fields like description, etc..
    return jsonify({'status': 'success', 'message': f'Payment processed successfully.'}), 201
    
@appner_post('/api/v1/stripe-payment/status')
def payment_status():
    # Fetch and verify the status of a specific Stripe transaction... (omitted for brevity)