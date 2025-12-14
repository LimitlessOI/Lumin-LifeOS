```jsx
import React, { useEffect, useState } from 'react';
import CourseCard from './CourseCard';
import useCourses from '../../hooks/useCourses';
import './CourseCatalog.css';

function CourseCatalog() {
    const { courses, loading, error } = useCourses();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error fetching courses.</div>;

    return (
        <div className="course-catalog">
            {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
            ))}
        </div>
    );
}

export default CourseCatalog;
```