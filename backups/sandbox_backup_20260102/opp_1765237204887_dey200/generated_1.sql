# routes.py - Flask API for handling endpoints in the backend service layer with Celery task queue management, integrating Stripe Webhooks:
from flask import Flask, request, jsonify
from celery import Celery
import stripe

app = Flask(__name__)
celery_app = Celery(app.name, broker='pyamqp://guest@localhost//')  # Configure your RabbitMQ as the message broker if necessary here...
stripe.api_key = 'your-stripe-secret-key'

celery_app.config['BROKER_URL'] = 'pyamqp://guest@localhost//'  # Configure your RabbitMQ as the message broker if necessary here...

# Stripe webhook handler that logs transactions to Neon PostgreSQL database using Django ORM:
from celery.signals import worker_init, task_finalized
import json
from django.db import models
from myapp.models import Transaction  # Make sure you have the corresponding model for Stripe transaction logging set up in your Django app.

@celery_app.task(bind=True)
def handle_stripe_webhook(self, data):
    payment = stripe.PaymentIntent.create(data["id"], execute=False)  # Assuming this is the payload from Stripe webhooks: https://www.stripe.com/docs/api#event-payloads
    
    if payment.status == 'succeeded':
        Transaction.objects.create(user_profile_id=request.args['user'], amount=payment.amount, transaction_date=datetime.now(), details=json.dumps(data))
        
# Endpoint to create tasks in the task queue:
@app.route('/api/v1/tasks', methods=['POST'])
def add_task():
    # ... Code for receiving and queuing a new task... 
    
# Stripe webhook endpoint that triggers when transactions are made, logs them to Neon PostgreSQL database:
@app.route('/api/v1/stripe_webhook', methods=['POST'])
def stripe_webhook():
    # ... Code for parsing the incoming JSON payload from Stripe and passing it off as a Celery task... 
    
# Django ORM Model setup in models.py to handle user profiles, tasks (jobs), snapshops, blind-spot data feeds:
from django.db import models

class UserProfile(models.Model):
    # ... Additional fields if needed for your model... 
    
# Task Queue Management with Celery in the backend service layer to handle asynchronous task processing of queued workloads by using tasks from `tasks.py`:
from celery_tasks.tasks import add, subtract  # Importing custom-defined tasks; make sure these are defined accordingly:
@worker_init.connect()
def on_worker_init(sender, **kwargs):
    sender.backend = 'djcelery'  # Assuming Django Celery beat as the default backend for periodic task scheduling if needed...
    
# Revenue Tracking setup using Stripe and Neon PostgreSQL database schema:
from django.db import migrations, models
class Transaction(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # or whichever precision needed for your case...
    transaction_date = models.DateTimeField()
    
# Real-time analytics dashboard setup with Grafana/Kibana:
from django.db import connection
import psycopg2
def log_revenue(user_profile_id, amount):  # This function would be scheduled to run periodically using a task scheduler like Celery beat or cron jobs depending on the system's needs and complexity of analytics required:
    with connection.cursor() as cursor:
        sql = "INSERT INTO revenue (user_profile_id, amount) VALUES (%s, %s)"  # This assumes you have a 'revenue' table in your Neon PostgreSQL database set up to log such data points...
        
# Frontend components using React and Material-UI for visualization of tasks queued/processed:
import React from 'react';
import { Button, Dialog } from '@material-ui/core';  # Example import; adjust imports based on actual library versions used.

class TaskDashboard extends React.Component {
    // ... Component code for displaying dashboard with progress bars and user profile settings...
    
# Database schema creation in PostgreSQL using Django ORM:
from django.db import models

def create_tables():  # Run this command outside the actual Flask app, but can be triggered as part of a CI/CD pipeline setup or manual migration process within your development workflows...
    from myapp.models import UserProfile, Transaction, CustomerFeedback  # Import necessary Django models that were defined in `models.py` above:
    
# Continuous Integration and Deployment (CI/CD) using Jenkins with GitHub Actions for Python backend services deployment pipeline setup scripting as part of the CI workflows on push to master branch or similar trigger points...