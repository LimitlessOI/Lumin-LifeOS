def fetch_spend_data():
    response = requests.get('https://example.com/finance/spend_data') # Replace 'https' with the actual HTTP scheme if needed
    spend_df = pd.read_csv(pd.compat.StringIO(response.text))  # assuming CSV format for simplicity here, though a real scenario might involve additional data processing steps or use of Pandas read from file operations on Azure Blob Storage directly as per the system's architecture and requirements
    return spend_df