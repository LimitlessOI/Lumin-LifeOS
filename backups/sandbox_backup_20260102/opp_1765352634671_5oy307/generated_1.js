from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import redis
import oslo.json as json # or any other JSON library that suits the needs of your project best 
import threading
import time
import requests
import datetime
import sys

app = Flask(__name__)
CORS(app, supports_encrypted_traffic=True)
api_key=''
REDIS_HOST="redis" # set this to your Redis server address 
TOKENS_TABLENAME='tokens'; task_queue=[]; userList = []; projectIDs={}
dbcon=SQLite3.connect('/path/to/your/sqlitefile')