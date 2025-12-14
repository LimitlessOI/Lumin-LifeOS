```javascript
import React from 'react';

const LessonPlayer = ({ lesson }) => {
    if (!lesson) return <div>Loading...</div>;

    return (
        <div>
            <h1>{lesson.title}</h1>
            <p>{lesson.description}</p>
            <video src={lesson.media_url} controls />
        </div>
    );
};

export default LessonPlayer;
```