from flask import Flask, jsonify, request
import stripe # Placeholder - actual integration will be in Express.js or Django etc...

app = Flask(__name__)
stripe_key = 'your-secret-api-key' # Replace with your Stripe API key for testing purposes only 

@app.route('/transaction/process', methods=['POST'])
def processPayment():
    data = request.get_json()
    amount = float(data['amount']) * exchangeRateToPc // Assume 'exchangeRateToPc' is a predefined constant representing the conversion rate to cents (if needed) 
    
    try:
        token = stripe.PaymentIntent.create(amount=int(f"{amount}"), currency='usd', payment_method="paypal", return_url="https://your-return-url") # 'paypal' is a placeholder, replace with actual integration details 
        
    except Exception as e:  
        print('Payment Error -> ', str(e))