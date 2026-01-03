import React from 'react';
import BusinessList from './BusinessList';
import ConsultationsForm from './ConsultationsForm';
// Additional imports as necessary for component functionality, e.g., useState and other hooks or components like Card if needed to display individual businesses/consultation options etc.. 
export default function Dashboard() {
    return (
        <div>
            <h1>Automation Workflow Consulting</h1>
            <BusinessList />
            <ConsultationsForm />
            // Additional components for displaying revenue tracking, etc. as necessary based on your system requirements and design choices 
        </div>
    );
}