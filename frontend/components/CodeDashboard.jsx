import React, { useEffect, useState } from 'react';
import CodeSubmissionForm from './CodeSubmissionForm';
import ReviewInterface from './ReviewInterface';

const CodeDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    // Fetch submissions from the API
    const fetchSubmissions = async () => {
      // Assume fetchSubmissionsAPI is a function to fetch submissions
      const data = await fetchSubmissionsAPI();
      setSubmissions(data);
    };

    fetchSubmissions();
  }, []);

  const handleSubmission = async (submissionData) => {
    // Assume createSubmissionAPI is a function to create a new submission
    const newSubmission = await createSubmissionAPI(submissionData);
    setSubmissions([...submissions, newSubmission]);
  };

  const handleReviewSubmit = async (reviewData) => {
    // Assume createReviewAPI is a function to submit a review
    await createReviewAPI(reviewData);
    alert('Review submitted successfully');
  };

  return (
    <div>
      <h1>Code Dashboard</h1>
      <CodeSubmissionForm onSubmit={handleSubmission} />
      <h2>Submissions</h2>
      <ul>
        {submissions.map((submission) => (
          <li key={submission.id} onClick={() => setSelectedSubmission(submission)}>
            {submission.code.slice(0, 20)}... ({submission.language})
          </li>
        ))}
      </ul>
      {selectedSubmission && (
        <ReviewInterface
          submissionId={selectedSubmission.id}
          onReviewSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
};

export default CodeDashboard;