```javascript
// Integration tests for the Dashboard component and project service
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import * as projectService from '../../services/projectService';

jest.mock('../../services/projectService');

describe('Integration Test', () => {
    it('fetches project data and displays it in the Dashboard', async () => {
        projectService.fetchProjects.mockResolvedValue([
            { id: 1, name: 'Project A', description: 'Description A' }
        ]);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Project A')).toBeInTheDocument();
        });
    });
});
```