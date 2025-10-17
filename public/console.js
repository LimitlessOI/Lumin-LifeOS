const socket = new WebSocket('ws://localhost:3000/stream');
const outputDiv = document.getElementById('output');
const inputField = document.getElementById('input');
const saveKeyButton = document.getElementById('saveKey');
const apiKeyInput = document.getElementById('apiKey');

socket.onmessage = function(event) {
    const message = event.data;
    outputDiv.innerHTML += `<div>${message}</div>`;
};

document.getElementById('send').addEventListener('click', function() {
    const model = document.querySelector('.tab.active').dataset.model;
    const input = inputField.value;
    socket.send(JSON.stringify({ model, input }));
    inputField.value = '';
});

saveKeyButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value;
    localStorage.setItem('apiKey', apiKey);
});

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelector('.tab.active')?.classList.remove('active');
        tab.classList.add('active');
    });
});