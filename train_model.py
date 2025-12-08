import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

def train_model(csv_file_path):
    data = pd.read_csv(csv_file_path)
    X = data.drop('failure', axis=1)
    y = data['failure']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier()
    model.fit(X_train, y_train)
    
    joblib.dump(model, 'predictive_maintenance_model.pkl')
    print('Model trained and saved successfully')

if __name__ == "__main__":
    train_model('device_data.csv')