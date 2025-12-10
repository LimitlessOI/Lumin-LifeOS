```jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Chart } from 'react-chartjs-2';
import 'leaflet/dist/leaflet.css';

const AgricultureDashboard = () => {
  const [sensorData, setSensorData] = useState([]);
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    // Fetch sensor data
    fetch('/api/sensor-data')
      .then(response => response.json())
      .then(data => {
        setSensorData(data);
        setChartData({
          labels: data.map(item => item.timestamp),
          datasets: [{
            label: 'Sensor Values',
            data: data.map(item => item.value),
            borderColor: 'rgba(75,192,192,1)',
            fill: false,
          }]
        });
      });
  }, []);

  return (
    <div>
      <h1>Agriculture Dashboard</h1>
      <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "400px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sensorData.map(sensor => (
          <Marker key={sensor.id} position={[sensor.lat, sensor.lng]}>
            <Popup>
              {sensor.name}: {sensor.value}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <Chart 
        type='line'
        data={chartData}
      />
    </div>
  );
};

export default AgricultureDashboard;