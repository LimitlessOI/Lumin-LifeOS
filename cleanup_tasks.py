import logging
import time
from datetime import datetime, timedelta
import sqlite3

# Configure logging
logging.basicConfig(filename='cleanup_tasks.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def reset_claimed_tasks(db_path):
    try:
        connection = sqlite3.connect(db_path)
        cursor = connection.cursor()
        fifteen_minutes_ago = datetime.now() - timedelta(minutes=15)
        cursor.execute("SELECT id FROM tasks WHERE status = 'claimed' AND updated_at < ?", (fifteen_minutes_ago,))
        tasks_to_reset = cursor.fetchall()
        for task in tasks_to_reset:
            cursor.execute("UPDATE tasks SET status = 'pending' WHERE id = ?", (task[0],))
            logging.info(f'Reset task ID {task[0]} to pending status.')
        connection.commit()
    except sqlite3.Error as e:
        logging.error(f'Database error: {e}')
    except Exception as e:
        logging.error(f'An error occurred: {e}')
    finally:
        if connection:
            connection.close()

if __name__ == '__main__':
    database_path = 'tasks.db'
    reset_claimed_tasks(database_path)