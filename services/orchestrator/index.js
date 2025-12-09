```javascript
app.post('/api/tasks', (req, res) => {
  const { name, status } = req.body;
  db.run('INSERT INTO tasks(name, status) VALUES(?, ?)', [name, status], function(err) {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Failed to create task' });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});
```