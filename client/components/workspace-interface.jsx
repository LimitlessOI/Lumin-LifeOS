```jsx
import React, { useEffect, useRef } from 'react';
import WebXREngine from '../../services/workspace/webxr-engine';

const WorkspaceInterface = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            new WebXREngine(containerRef.current);
        }
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100vh' }}>
            <h1>Welcome to LifeOS Workspace</h1>
            <button>Toggle Immersion Mode</button>
        </div>
    );
};

export default WorkspaceInterface;
```