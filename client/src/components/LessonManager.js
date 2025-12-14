```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LessonManager = () => {
    const [lessons, setLessons] = useState([]);

    useEffect(() => {
        axios.get('/api/lessons')
            .then(response => setLessons(response.data))
            .catch(error => console.error(error));
    }, []);

    return (
        <div>
            <h1>Lesson Manager</h1>
            {lessons.map(lesson => (
                <div key={lesson.id}>
                    <h2>{lesson.title}</h2>
                    <p>{lesson.description}</p>
                </div>
            ))}
        </div>
    );
};

export default LessonManager;
```