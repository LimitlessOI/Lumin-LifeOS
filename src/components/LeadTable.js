import React from 'react';

const LeadTable = ({ leads, onCall }) => {
  return (
    <table className="min-w-full border-collapse border border-gray-200">
      <thead>
        <tr>
          <th className="border border-gray-300 p-2">Name</th>
          <th className="border border-gray-300 p-2">Phone</th>
          <th className="border border-gray-300 p-2">Status</th>
          <th className="border border-gray-300 p-2">Last Contact</th>
          <th className="border border-gray-300 p-2">Next Action</th>
          <th className="border border-gray-300 p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {leads.map(lead => (
          <tr key={lead.id}>
            <td className="border border-gray-300 p-2">{lead.name}</td>
            <td className="border border-gray-300 p-2">{lead.phone}</td>
            <td className="border border-gray-300 p-2">{lead.status}</td>
            <td className="border border-gray-300 p-2">{lead.last_contact}</td>
            <td className="border border-gray-300 p-2">{lead.next_action}</td>
            <td className="border border-gray-300 p-2">
              <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => onCall(lead.id)}>Call</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LeadTable;