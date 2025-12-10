import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import useConsultantAvailability from '../../lib/hooks/useConsultantAvailability';
import ConsultantCard from './ConsultantCard';

const socket = io();

const ConsultantAvailabilityChecker = () => {
  const { consultants, loading, error } = useConsultantAvailability();
  const [realTimeConsultants, setRealTimeConsultants] = useState([]);

  useEffect(() => {
    socket.on('update_consultants', (data) => {
      setRealTimeConsultants(data);
    });

    return () => {
      socket.off('update_consultants');
    };
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading consultants.</p>;

  const consultantsToDisplay = realTimeConsultants.length ? realTimeConsultants : consultants;

  return (
    <div>
      {consultantsToDisplay.map(consultant => (
        <ConsultantCard key={consultant.id} consultant={consultant} />
      ))}
    </div>
  );
};

export default ConsultantAvailabilityChecker;