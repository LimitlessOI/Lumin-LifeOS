```jsx
import React, { useState } from 'react';

const NaturalLanguageInput = () => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Process NLP query
        console.log('Submitted query:', query);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query..."
            />
            <button type="submit">Submit</button>
        </form>
    );
};

export default NaturalLanguageInput;
```