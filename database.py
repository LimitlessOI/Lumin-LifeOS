from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class OutreachLead(Base):
    __tablename__ = 'outreach_leads'
    id = Column(Integer, primary_key=True)
    status = Column(String)

engine = create_engine('sqlite:///leads.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)


def update_lead_status(interest_level):
    session = Session()
    lead = session.query(OutreachLead).first()
    lead.status = interest_level
    session.commit()
    session.close()


def create_follow_up_task(next_best_action):
    # Logic to create a follow-up task in the database