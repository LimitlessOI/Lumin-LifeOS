function makeCall() {
  const isSimulation = document.getElementById('simulationToggle').checked;
  fetch('/api/v1/outreach/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Test call' })
  }).then(response => response.json()).then(data => alert(JSON.stringify(data)));
}

function sendSms() {
  const isSimulation = document.getElementById('simulationToggle').checked;
  fetch('/api/v1/outreach/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Test SMS' })
  }).then(response => response.json()).then(data => alert(JSON.stringify(data)));
}