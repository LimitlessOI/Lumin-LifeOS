```jsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR } from '@react-three/xr';

function Box() {
  const ref = useRef();
  useFrame((state, delta) => (ref.current.rotation.x += delta));
  return (
    <mesh ref={ref}>
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function ImmersiveSandbox() {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <XR>
        <Box />
      </XR>
    </Canvas>
  );
}
```