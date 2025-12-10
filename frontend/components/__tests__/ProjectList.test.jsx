```javascript
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectList from '../ProjectList';

describe('ProjectList Component', () => {
    it('displays a list of project names and descriptions', () => {
        const projects = [
            { id: 1, name: 'Project A', description: 'Description A' },
            { id: 2, name: 'Project B', description: 'Description B' }
        ];

        const { getByText } = render(<ProjectList projects={projects} />);

        expect(getByText('Project A')).toBeInTheDocument();
        expect(getByText('Description A')).toBeInTheDocument();
        expect(getByText('Project B')).toBeInTheDocument();
        expect(getByText('Description B')).toBeInTheDocument();
    });
});
```