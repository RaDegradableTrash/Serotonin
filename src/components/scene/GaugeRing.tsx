import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GaugeRingProps {
  mode: number; // 1–4
}

// Target angles per mode (in radians) — like a dial
const modeAngles: Record<number, number> = {
  1: 0,
  2: Math.PI / 2,
  3: Math.PI,
  4: (3 * Math.PI) / 2,
};

const TICK_COUNT = 60;
const RADIUS = 1.4;

const GaugeRing: React.FC<GaugeRingProps> = ({ mode }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const targetAngle = modeAngles[mode] ?? 0;

  useFrame(() => {
    if (!groupRef.current) return;
    const current = groupRef.current.rotation.z;
    // Smooth spring towards target
    groupRef.current.rotation.z = THREE.MathUtils.lerp(current, -targetAngle, 0.06);
  });

  // Build tick marks as line segments using BufferGeometry Points
  const ticks = React.useMemo(() => {
    const items: React.ReactElement[] = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      const angle = (i / TICK_COUNT) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      const innerR = RADIUS - (isMajor ? 0.18 : 0.09);
      const outerR = RADIUS;

      const x1 = Math.cos(angle) * innerR;
      const y1 = Math.sin(angle) * innerR;
      const x2 = Math.cos(angle) * outerR;
      const y2 = Math.sin(angle) * outerR;

      const points = [new THREE.Vector3(x1, y1, 0), new THREE.Vector3(x2, y2, 0)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      items.push(
        <primitive key={i} object={
          (() => {
            const mat = new THREE.LineBasicMaterial({ color: isMajor ? '#333333' : '#888888' });
            return new THREE.Line(geo, mat);
          })()
        } />
      );
    }
    return items;
  }, []);

  // Arrow pointer at top (0°)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, RADIUS + 0.06);
  arrowShape.lineTo(-0.08, RADIUS - 0.12);
  arrowShape.lineTo(0.08, RADIUS - 0.12);
  arrowShape.closePath();

  return (
    <group position={[4.2, 0, -1]} ref={groupRef}>
      {ticks}
      {/* Pointer triangle */}
      <mesh>
        <shapeGeometry args={[arrowShape]} />
        <meshBasicMaterial color="#222222" side={THREE.DoubleSide} />
      </mesh>
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color="#444444" />
      </mesh>
    </group>
  );
};

export default GaugeRing;
