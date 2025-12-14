```javascript
import React, { useEffect, useState } from 'react';

const StatusFeed = ({ socket }) => {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setUpdates((prev) => [message, ...prev]);
    };

    return () => {
      socket.close();
    };
  }, [socket]);

  return (
    <div className="status-feed">
      {updates.map((update, index) => (
        <div key={index} className="update">
          {update.message}
        </div>
      ))}
    </div>
  );
};

export default StatusFeed;