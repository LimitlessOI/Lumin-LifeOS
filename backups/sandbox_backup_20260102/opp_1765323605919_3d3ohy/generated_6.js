def preprocess_data(spend_df):
    scaler = StandardScaler()
    labelencoder = LabelEncoder()
    
    # Assuming 'Department' and currency columns exist in the spend_df dataframe which we want to encode categorically for modeling purposes. Remove or adjust based on actual data structure:
    spend_df['Currency'] = labelencoder.fit_transform(spend end preprocessing...):