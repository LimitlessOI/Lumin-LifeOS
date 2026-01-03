# alembic version control setup (not part of the initial request but necessary)
from alembic import command_executor as ace
import os
os.environ['ALEMBIC'] = 'env/test'  # Path to your Alembic env directory, usually in .gitignore or similar config file
ace.Script().upgrade()