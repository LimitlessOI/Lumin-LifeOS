import numpy as np
from scipy import stats
# Assuming 'data' is a list of sensor readings and temp_values holds the corresponding temperatures (in Celsius)
def process_seismic_wave_data(raw_data, temperature_readings):
    processed_data = [remove_outliers(reading, data=raw_data[i:i+10]) for i in range(len(raw_data)-9)] # Assuming readings come in 10-sample windows. Adjust as needed!
    
def remove_outliers(window_of_readings):
    q1, q3 = np.percentile(window_of_readings, [25 ,75]), (len(window_of_readings) + 1)*3//4 # Interquartile range method for outlier removal
    return filtered_data[np.abs(filtered_data - q3) < (q3-q1)] * np.mean([temp**0.25, temp**0.75]) # Temperature correction factor to maintain linearity between seismic speed and temperature might be required