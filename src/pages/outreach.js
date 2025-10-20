import React, { useState, useEffect } from 'react';
import LeadTable from '../components/LeadTable';
import Filters from '../components/Filters';
import DailyStats from '../components/DailyStats';
import '../styles/tailwind.css';

const Outreach = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ totalLeads: 0, callsMade: 0, joinRate: 0 });

  useEffect(() => {
    // Fetch leads from the outreach_leads table
    fetch('/api/outreach_leads')
      .then(response => response.json())
      .then(data => {
        setLeads(data);
        setFilteredLeads(data);
        setStats({
          totalLeads: data.length,
          callsMade: data.filter(lead => lead.status === 'contacted').length,
          joinRate: (data.filter(lead => lead.status === 'joined').length / data.length) * 100
        });
      });
  }, []);

  useEffect(() => {
    if (statusFilter) {
      setFilteredLeads(leads.filter(lead => lead.status === statusFilter));
    } else {
      setFilteredLeads(leads);
    }
  }, [statusFilter, leads]);

  const handleCall = (leadId) => {
    // Logic to trigger call
    console.log('Calling lead with ID:', leadId);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Outreach Dashboard</h1>
      <Filters setStatusFilter={setStatusFilter} />
      <LeadTable leads={filteredLeads} onCall={handleCall} />
      <DailyStats stats={stats} />
    </div>
  );
};

export default Outreach;