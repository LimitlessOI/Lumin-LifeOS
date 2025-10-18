document.addEventListener('DOMContentLoaded', function() {
    fetchTaskQueue();
    fetchPodStatus();

    const form = document.getElementById('enqueue-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const taskName = document.getElementById('task-name').value;
        enqueueTask(taskName);
    });
});

function fetchTaskQueue() {
    fetch('/api/v1/orch/queue')
        .then(response => response.json())
        .then(data => {
            const queueDiv = document.getElementById('task-queue');
            queueDiv.innerHTML = '<h2 class="text-xl font-semibold">Current Task Queue</h2>';
            const ul = document.createElement('ul');
            data.tasks.forEach(task => {
                const li = document.createElement('li');
                li.textContent = task.name;
                ul.appendChild(li);
            });
            queueDiv.appendChild(ul);
        })
        .catch(error => console.error('Error fetching task queue:', error));
}

function fetchPodStatus() {
    // This is a placeholder for the pod status fetching logic
    const podStatusDiv = document.getElementById('pod-status');
    podStatusDiv.innerHTML = '<h2 class="text-xl font-semibold">Pod Status</h2>';
    const ul = document.createElement('ul');
    const pods = [
        { name: 'Pod A', last_seen: '2023-10-01 12:00:00' },
        { name: 'Pod B', last_seen: '2023-10-01 12:05:00' }
    ];
    pods.forEach(pod => {
        const li = document.createElement('li');
        li.textContent = `${pod.name} - Last Seen: ${pod.last_seen}`;
        ul.appendChild(li);
    });
    podStatusDiv.appendChild(ul);
}

function enqueueTask(taskName) {
    // Placeholder for task enqueue logic
    console.log('Enqueued task:', taskName);
    alert('Task enqueued: ' + taskName);
    document.getElementById('task-name').value = '';
}