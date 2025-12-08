```jsx
import React, { useState } from 'react';
import axios from 'axios';

function VotingInterface() {
  const [voterId, setVoterId] = useState('');
  const [electionId, setElectionId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [proof, setProof] = useState('');
  const [publicSignals, setPublicSignals] = useState('');

  const submitVote = async () => {
    try {
      const response = await axios.post('/api/vote', {
        voterId,
        electionId,
        candidateId,
        proof,
        publicSignals
      });
      alert(response.data);
    } catch (error) {
      alert('Error submitting vote');
    }
  };

  return (
    <div>
      <h2>Voting Interface</h2>
      <input type="text" placeholder="Voter ID" value={voterId} onChange={(e) => setVoterId(e.target.value)} />
      <input type="text" placeholder="Election ID" value={electionId} onChange={(e) => setElectionId(e.target.value)} />
      <input type="text" placeholder="Candidate ID" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} />
      <textarea placeholder="Proof" value={proof} onChange={(e) => setProof(e.target.value)}></textarea>
      <textarea placeholder="Public Signals" value={publicSignals} onChange={(e) => setPublicSignals(e.target.value)}></textarea>
      <button onClick={submitVote}>Submit Vote</button>
    </div>
  );
}

export default VotingInterface;
```