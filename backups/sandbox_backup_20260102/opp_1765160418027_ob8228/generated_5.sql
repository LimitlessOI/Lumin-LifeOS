// createProjectForm.html - React component for creating a new project with input fields and form submission handling using Material Design by Google (Poppins fonts & icons)
import React, { useState } from 'react';
import './createProjectForm.css'; // Assuming we have our own CSS stylesheets to match the design of Poppins Fonts for consistency in UI/UX aesthetic 
import MdAddBoxOutlined from '@material-ui/icons/AddBoxOutlined'; // Material Design icons provided by Google's library or custom designs if necessary. Replace with actual import paths as needed.

function CreateProjectForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    
    function handleSubmit(e) {
        e.preventDefault();
        
        // Here we would typically make an API call to create the project on our backend using Fetch or Axios and then update state accordingly upon success/error responses
        console.log(`Title: ${title}, Description: ${description}`); 
    }
    
    return (
        <form noValidate>
            <div className="App">
                <label htmlFor="project-title">Project Title</label>
                <input type="text" id="project-title" value={title} onChange={e => setTitle(e.target.value)} required />
                
                <label htmlFor="description">Description of your project (optional)</label> 
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)}></textarea>

                {/* Form Submit Button */}
                <button type="submit" style={{ '--light-theme': true }} aria-label="Submit Project">
                    Create New Project 
                </button>
            </div>
        </form>
    );
}
export default CreateProjectForm;