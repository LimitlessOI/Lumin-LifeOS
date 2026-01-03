import requests
import pandas as pd
from sqlalchemy import create_engine
import matplotlib.pyplot as plt
import tensorflow as tf
from sklearn.preprocessing import StandardScaler, LabelEncoder
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, generate_sastoken
# additional imports...