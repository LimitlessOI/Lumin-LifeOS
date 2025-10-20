from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class OutreachLead(db.Model):
    __tablename__ = 'outreach_leads'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    address = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), nullable=False)