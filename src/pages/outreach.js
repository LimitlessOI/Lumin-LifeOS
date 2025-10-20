import React, { useState, useEffect } from 'react';
import LeadTable from '../components/LeadTable';
import Filters from '../components/Filters';
import DailyStats from '../components/DailyStats';
import '../../styles/tailwind.css';

const Outreach = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dailyStats, setDailyStats] = useState({ totalLeads: 0, callsMade: 0, joinRate: 0 });

  useEffect(() => {
    // Fetch leads and daily stats from API
    const fetchData = async () => {
      const leadsResponse = await fetch('/api/outreach_leads');
      const leadsData = await leadsResponse.json();
      setLeads(leadsData);
      setFilteredLeads(leadsData);

      const statsResponse = await fetch('/api/daily_stats');
      const statsData = await statsResponse.json();
      setDailyStats(statsData);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (statusFilter) {
      setFilteredLeads(leads.filter(lead => lead.status === statusFilter));
    } else {
      setFilteredLeads(leads);
    }
  }, [statusFilter, leads]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Outreach CRM Dashboard</h1>
      <DailyStats stats={dailyStats} />
      <Filters statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
      <LeadTable leads={filteredLeads} />
    </div>
  );
};

export default Outreach;