import React from 'react';
import BookingModal from './BookingModal';

const ConsultantCard = ({ consultant }) => {
  return (
    <div className="consultant-card">
      <h3>{consultant.name}</h3>
      <p>Expertise: {consultant.expertise}</p>
      <BookingModal consultantId={consultant.id} />
    </div>
  );
};

export default ConsultantCard;