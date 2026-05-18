import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ReceptorGridProps {
  active: boolean;
  accentColor: THREE.Color;
}

const ReceptorGrid: React.FC<ReceptorGridProps> = ({ active, accentColor }) => {
  const dotPositions = useMemo(() => {
    const positions: [number, number][] = [];
    // 3x3 dot grid around center
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        if (r === 0 && c === 0) continue;
        positions.push([c * 0.18, r * 0.18]);
      }
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Cross (+) symbol */}
      {/* Horizontal bar */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.55, 0.10]} />
        <meshBasicMaterial 
          color="white" 
          transparent={true}
          polygonOffset={true}       // 开启深度偏移
          polygonOffsetFactor={-10}  // 负得越多越靠前，强行在 WebGL 深度图里拿到最前排门票
          polygonOffsetUnits={-10}
          depthWrite={false} />

      </mesh>
      {/* Vertical bar */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.10, 0.55]} />
        <meshBasicMaterial 
          color="white" 
          transparent={true}
          polygonOffset={true}       // 开启深度偏移
          polygonOffsetFactor={-10}  // 负得越多越靠前，强行在 WebGL 深度图里拿到最前排门票
          polygonOffsetUnits={-10}
          depthWrite={false} />
      </mesh>

      {/* Dot matrix */}
      {dotPositions.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.01]}>
          <circleGeometry args={[0.035, 12]} />
          <meshBasicMaterial color={active ? accentColor : new THREE.Color('white')} 
            transparent={true}
            polygonOffset={true}       // 开启深度偏移
            polygonOffsetFactor={-10}  // 负得越多越靠前，强行在 WebGL 深度图里拿到最前排门票
            polygonOffsetUnits={-10}
            depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

export default ReceptorGrid;
