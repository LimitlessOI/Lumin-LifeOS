from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

class OutreachLead(Base):
    __tablename__ = 'outreach_leads'
    id = Column(Integer, primary_key=True)
    status = Column(String)

DATABASE_URL = 'sqlite:///leads.db'
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def update_lead_status(lead_id, interest_level):
    session = Session()
    lead = session.query(OutreachLead).filter(OutreachLead.id == lead_id).first()
    if lead:
        lead.status = interest_level
        session.commit()
    session.close()


def create_follow_up_task(lead_id, next_best_action):
    # Implementation for creating follow-up task
    pass
