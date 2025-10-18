const fs = require('fs');
const path = require('path');
const tasksFilePath = path.join(__dirname, 'tasks.json');

function loadTasks() {
    if (!fs.existsSync(tasksFilePath)) return [];
    const data = fs.readFileSync(tasksFilePath);
    return JSON.parse(data);
}

function saveTasks(tasks) {
    fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
}

const tasks = loadTasks();
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

taskForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const status = document.getElementById('task-status').value;

    if (!title) {
        alert('Title is required.');
        return;
    }

    const newTask = { title, description, status };
    tasks.push(newTask);
    saveTasks(tasks);
    renderTasks();
    taskForm.reset();
});

function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `<span>${task.title} - ${task.status}</span>
                        <button onclick="deleteTask(${index})">Delete</button>`;
        taskList.appendChild(li);
    });
}

function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks();
}

renderTasks();