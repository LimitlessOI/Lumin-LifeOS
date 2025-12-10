import React, { useState } from 'react';

const BookingModal = ({ consultantId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleBooking = async () => {
    // Handle booking logic
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Book a Slot</button>
      {isOpen && (
        <div className="modal">
          <h4>Available Slots</h4>
          {/* Display slots here */}
          <button onClick={handleBooking}>Confirm Booking</button>
        </div>
      )}
    </div>
  );
};

export default BookingModal;