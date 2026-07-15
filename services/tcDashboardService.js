/**
 * SYNOPSIS: Exports getAgentDashboardCard — services/tcDashboardService.js.
 */
export function getAgentDashboardCard(agentId) {
  // Placeholder for real-time data fetching logic
  const mockData = {
    status: 'active',
    tasks: 5,
    messages: 3,
    lastUpdated: new Date().toISOString(),
  };

  return {
    agentId,
    ...mockData,
  };
}
