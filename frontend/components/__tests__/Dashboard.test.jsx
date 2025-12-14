```javascript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import * as projectService from '../../services/projectService';

jest.mock('../../services/projectService');

describe('Dashboard Component', () => {
    it('renders a list of projects', async () => {
        projectService.fetchProjects.mockResolvedValue([
            { id: 1, name: 'Project A', description: 'Description A' },
            { id: 2, name: 'Project B', description: 'Description B' }
        ]);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
            expect(screen.getByText('Project B')).toBeInTheDocument();
        });
    });

    it('displays an error message on fetch failure', async () => {
        projectService.fetchProjects.mockRejectedValue(new Error('Fetch failed'));

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Error: Fetch failed')).toBeInTheDocument();
        });
    });
});
```