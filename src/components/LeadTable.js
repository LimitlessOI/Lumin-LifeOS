import React from 'react';

const LeadTable = ({ leads, onCallTrigger }) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Action</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.phone}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.status}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.last_contact}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.next_action}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <button onClick={() => onCallTrigger(lead)} className="text-blue-600 hover:text-blue-900">Call</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LeadTable;