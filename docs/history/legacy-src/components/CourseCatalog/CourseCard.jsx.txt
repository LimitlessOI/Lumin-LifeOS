```jsx
import React from 'react';
import { formatPrice } from '../../utils/courseFormatters';

function CourseCard({ course }) {
    return (
        <div className="course-card">
            <h2>{course.title}</h2>
            <p>{course.description}</p>
            <p><strong>Price:</strong> {formatPrice(course.price)}</p>
            <p><strong>Category:</strong> {course.category}</p>
            <p><strong>Duration:</strong> {course.duration_minutes} mins</p>
        </div>
    );
}

export default CourseCard;
```