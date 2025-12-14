import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const RealTimeUpdater = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io('/api/v1/analytics/realtime/updates');

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('message', (msg) => {
      setMessages(prevMessages => [...prevMessages, JSON.parse(msg)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h2>Real Time Updates</h2>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg.message}</li>
        ))}
      </ul>
    </div>
  );
};

export default RealTimeUpdater;