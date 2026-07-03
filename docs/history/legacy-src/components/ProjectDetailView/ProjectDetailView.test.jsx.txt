```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import ProjectDetailView from './ProjectDetailView';

const queryClient = new QueryClient();

test('renders project detail view', async () => {
    render(
        <QueryClientProvider client={queryClient}>
            <ProjectDetailView projectId={1} />
        </QueryClientProvider>
    );

    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
});
```