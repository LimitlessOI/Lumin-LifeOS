```javascript
import React, { useEffect } from 'react';
import ReactFlow, { Background, Controls } from 'react-flow-renderer';
import { io } from 'socket.io-client';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';

const WorkflowEditor = () => {
    useEffect(() => {
        const socket = io();
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
        });
        return () => socket.disconnect();
    }, []);

    return (
        <div style={{ height: '100vh', display: 'flex' }}>
            <Sidebar />
            <div style={{ flex: 1 }}>
                <Toolbar />
                <ReactFlow>
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default WorkflowEditor;