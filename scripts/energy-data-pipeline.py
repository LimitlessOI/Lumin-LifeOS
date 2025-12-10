import requests
import pandas as pd

def fetch_data(api_url):
    response = requests.get(api_url)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception("Failed to fetch data")

def preprocess_data(data):
    df = pd.DataFrame(data)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df

def main():
    api_url = 'https://api.energydata.com/v1/devices'
    raw_data = fetch_data(api_url)
    processed_data = preprocess_data(raw_data)
    print(processed_data.head())

if __name__ == '__main__':
    main()