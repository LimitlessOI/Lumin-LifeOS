import React, { useEffect, useState } from 'react';
import LeadTable from '../components/LeadTable';
import Filters from '../components/Filters';
import DailyStats from '../components/DailyStats';
import '../styles/tailwind.css';

const Outreach = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [filter, setFilter] = useState('');
  const [stats, setStats] = useState({ totalLeads: 0, callsMade: 0, joinRate: 0 });

  useEffect(() => {
    // Fetch leads data from an API or database
    const fetchLeads = async () => {
      const response = await fetch('/api/outreach_leads');
      const data = await response.json();
      setLeads(data);
      setFilteredLeads(data);
      calculateStats(data);
    };
    fetchLeads();
  }, []);

  const calculateStats = (data) => {
    const totalLeads = data.length;
    const callsMade = data.filter(lead => lead.status === 'contacted').length;
    const joinRate = (data.filter(lead => lead.status === 'joined').length / totalLeads) * 100 || 0;

    setStats({ totalLeads, callsMade, joinRate });
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (newFilter) {
      setFilteredLeads(leads.filter(lead => lead.status === newFilter));
    } else {
      setFilteredLeads(leads);
    }
  };

  const triggerCall = (lead) => {
    // Implement call logic here
    console.log(`Calling ${lead.name}...`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Outreach CRM Dashboard</h1>
      <Filters filter={filter} onFilterChange={handleFilterChange} />
      <LeadTable leads={filteredLeads} onCallTrigger={triggerCall} />
      <DailyStats stats={stats} />
    </div>
  );
};

export default Outreach;