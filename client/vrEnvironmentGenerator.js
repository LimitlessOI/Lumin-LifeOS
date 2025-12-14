```javascript
import * as THREE from 'three';
import { Canvas, useFrame } from 'react-three-fiber';

function VRScene() {
    const mesh = React.useRef();
    useFrame(() => {
        mesh.current.rotation.x += 0.01;
        mesh.current.rotation.y += 0.01;
    });

    return (
        <mesh ref={mesh}>
            <boxBufferGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color='orange' />
        </mesh>
    );
}

export default function VREnvironmentGenerator() {
    return (
        <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <VRScene />
        </Canvas>
    );
}
```