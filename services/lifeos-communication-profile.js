/**
 * SYNOPSIS: Service module — Lifeos Communication Profile.
 */
export const communicationProfile = {
  name: "Communication Profile",
  description: "Displays user communication styles and effectiveness.",
  ui: `
    <div id="communicationProfileOverlay" class="lifeos-overlay-card" style="display:none;">
      <h3>Communication Profile</h3>
      <p>Your communication styles and effectiveness, based on data from the <code>communication_profiles</code> table.</p>
      <div id="communicationProfileContent">
        <!-- Content will be loaded dynamically -->
        Loading communication data...
      </div>
      <button onclick="document.getElementById('communicationProfileOverlay').style.display='none'">Close</button>
    </div>

    <script>
      // Function to open the communication profile overlay
      function openCommunicationProfile() {
        document.getElementById('communicationProfileOverlay').style.display = 'block';
        // In a real application, you would fetch data from the backend here
        // and populate #communicationProfileContent
        const dummyData = {
          style: "Direct, Analytical",
          effectiveness: "High in task-oriented discussions, room for improvement in empathetic listening.",
          feedback: "Consider incorporating more active listening techniques."
        };
        document.getElementById('communicationProfileContent').innerHTML = \`
          <p><strong>Style:</strong> \${dummyData.style}</p>
          <p><strong>Effectiveness:</strong> \${dummyData.effectiveness}</p>
          <p><strong>Feedback:</strong> \${dummyData.feedback}</p>
          <p><em>Data derived from your interactions, stored in <code>communication_profiles</code>.</em></p>
        \`;
      }

      // This script assumes it will be loaded within or alongside lifeos-coach.html
      // and that there's a mechanism (e.g., a button) to call openCommunicationProfile()
      // For demonstration, we can add a temporary button or call it directly for testing.
      // Example of how you might integrate it into lifeos-coach.html:
      // <button onclick="openCommunicationProfile()">View Communication Profile</button>
    </script>
  `,
};