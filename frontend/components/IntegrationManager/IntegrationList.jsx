```jsx
import React, { useEffect, useState } from 'react';
import { useIntegrations } from '../../hooks/useIntegrations';

const IntegrationList = () => {
    const [integrations, setIntegrations] = useState([]);
    const { getIntegrations } = useIntegrations();

    useEffect(() => {
        getIntegrations().then(setIntegrations);
    }, [getIntegrations]);

    return (
        <ul>
            {integrations.map(integration => (
                <li key={integration.id}>{integration.name}</li>
            ))}
        </ul>
    );
};

export default IntegrationList;