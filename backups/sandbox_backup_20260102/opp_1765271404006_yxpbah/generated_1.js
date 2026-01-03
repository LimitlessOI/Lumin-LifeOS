from django.conf import settings
import os
import psycopg2

def create_database():
    conn = None
    try:
        # Connect to default database (or your desired one)
        conn = psycopg2.connect(host=settings.DATABASES['default']['HOST'], dbname=settings.DATABASES['default']['NAME']) 
        
        cur = conn.cursor()
        cur.execute("CREATE DATABASE IF NOT EXISTS make_com;")
    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
    finally:
        if conn is not None:
            conn.close()  # Close connection to default database
        
create_database()