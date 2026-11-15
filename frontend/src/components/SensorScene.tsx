import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  moduleId: string;
  moduleName?: string;
  co2: number;
  rad: number;
  shielded?: boolean;
  scanning?: boolean;
};

function BayShell({ tint }: { tint: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.5, 4.5]} />
        <meshStandardMaterial color="#d6dee8" metalness={0.15} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.35, -1.4]}>
        <boxGeometry args={[4.8, 2.9, 0.12]} />
        <meshStandardMaterial color={tint} metalness={0.1} roughness={0.45} />
      </mesh>
      <mesh position={[-2.0, 1.35, 0]}>
        <boxGeometry args={[0.12, 2.9, 3.2]} />
        <meshStandardMaterial color="#cfd8e4" />
      </mesh>
      <mesh position={[2.0, 1.35, 0]}>
        <boxGeometry args={[0.12, 2.9, 3.2]} />
        <meshStandardMaterial color="#cfd8e4" />
      </mesh>
      <mesh position={[0, 2.75, 0]}>
        <boxGeometry args={[4.8, 0.1, 3.2]} />
        <meshStandardMaterial color="#f2f6fb" />
      </mesh>
      {[-1, 0.6].map((x) => (
        <mesh key={x} position={[x, 2.68, 0]}>
          <boxGeometry args={[1.0, 0.06, 0.4]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={1.5} />
        </mesh>
      ))}
      <mesh position={[-1.55, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 1.8, 12]} />
        <meshStandardMaterial color="#7a8ea3" metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

function SensorHead({ color, scanning }: { color: string; scanning?: boolean }) {
  const led = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!led.current) return;
    const pulse = scanning ? 1.2 + Math.sin(performance.now() / 120) * 0.8 : 0.55 + Math.sin(performance.now() / 220) * 0.45;
    (led.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
  });
  return (
    <group position={[-0.15, 1.75, -1.25]}>
      <mesh>
        <boxGeometry args={[0.85, 0.4, 0.22]} />
        <meshStandardMaterial color="#9aabbc" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh ref={led} position={[0, 0, 0.14]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

function Co2Haze({ intensity }: { intensity: number }) {
  if (intensity <= 0) return null;
  return (
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[4.2, 2.2, 2.6]} />
      <meshStandardMaterial color="#c4a035" transparent opacity={0.08 + intensity * 0.18} depthWrite={false} />
    </mesh>
  );
}

function RadSparks({ count }: { count: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const t = performance.now() / 400;
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = 0.4 + ((Math.sin(t + i) + 1) / 2) * 1.6;
      m.position.x = -1.2 + (i % 5) * 0.5 + Math.sin(t * 1.3 + i) * 0.1;
    });
  });
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[-1 + (i % 5) * 0.45, 0.5, -0.4]}
        >
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#e03c31" emissive="#e03c31" emissiveIntensity={1.6} />
        </mesh>
      ))}
    </>
  );
}

function ModuleProps({ moduleId }: { moduleId: string }) {
  if (moduleId === "gym") {
    return (
      <group>
        <mesh position={[0.7, 0.55, -0.3]}>
          <boxGeometry args={[1.1, 0.12, 0.5]} />
          <meshStandardMaterial color="#6a7d92" />
        </mesh>
        <mesh position={[0.7, 0.9, -0.3]}>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 12]} />
          <meshStandardMaterial color="#8db4ff" metalness={0.5} />
        </mesh>
        <mesh position={[-0.6, 0.45, 0.4]}>
          <boxGeometry args={[0.8, 0.35, 0.8]} />
          <meshStandardMaterial color="#a8b6c6" />
        </mesh>
      </group>
    );
  }
  if (moduleId === "quarters") {
    return (
      <group>
        <mesh position={[0.8, 0.7, -0.6]}>
          <boxGeometry args={[0.9, 1.2, 0.5]} />
          <meshStandardMaterial color="#b7c4d3" />
        </mesh>
        <mesh position={[-0.7, 0.35, 0.2]}>
          <boxGeometry args={[0.7, 0.25, 1.4]} />
          <meshStandardMaterial color="#9aabbc" />
        </mesh>
      </group>
    );
  }
  if (moduleId === "shelter") {
    return (
      <group>
        <mesh position={[0, 1.2, -0.9]}>
          <boxGeometry args={[2.2, 1.8, 0.2]} />
          <meshStandardMaterial color="#8db4ff" metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, -0.75]}>
          <torusGeometry args={[0.45, 0.06, 12, 24]} />
          <meshStandardMaterial color="#4f8cff" emissive="#4f8cff" emissiveIntensity={0.35} />
        </mesh>
      </group>
    );
  }
  if (moduleId === "lab" || moduleId === "columbus" || moduleId === "kibo") {
    return (
      <group>
        <mesh position={[0.6, 1.0, -1.0]}>
          <boxGeometry args={[1.2, 0.9, 0.35]} />
          <meshStandardMaterial color="#7a8ea3" />
        </mesh>
        <mesh position={[-0.7, 0.9, -0.5]}>
          <cylinderGeometry args={[0.25, 0.28, 1.1, 14]} />
          <meshStandardMaterial color="#a8b6c6" metalness={0.55} />
        </mesh>
      </group>
    );
  }
  // node / zarya default: galley / storage crates
  return (
    <group>
      <mesh position={[0.5, 0.45, 0.2]}>
        <boxGeometry args={[0.7, 0.55, 0.7]} />
        <meshStandardMaterial color="#9aabbc" />
      </mesh>
      <mesh position={[-0.6, 0.35, -0.2]}>
        <boxGeometry args={[0.55, 0.4, 0.55]} />
        <meshStandardMaterial color="#7a8ea3" />
      </mesh>
    </group>
  );
}

export function SensorScene({ moduleId, co2, rad, shielded, scanning }: Props) {
  const hot = rad > 2 && !shielded;
  const warm = co2 >= 2.5;
  const tint = useMemo(() => {
    if (hot) return "#f0d5d2";
    if (warm) return "#f3e7c8";
    if (moduleId === "shelter") return "#dce8f8";
    if (moduleId === "gym") return "#e4ebe4";
    if (moduleId === "quarters") return "#ebe6ef";
    return "#e8eef5";
  }, [hot, warm, moduleId]);
  const led = hot ? "#e03c31" : warm ? "#f0b429" : scanning ? "#7fd0ff" : "#3aa0ff";
  const haze = warm ? Math.min(1, (co2 - 2.4) / 1.2) : 0;
  const sparks = hot ? Math.min(14, 4 + Math.floor(rad)) : 0;

  return (
    <div className="robot-canvas closeup">
      <Canvas camera={{ position: [1.9, 1.65, 2.55], fov: 40 }}>
        <color attach="background" args={["#b8c7d8"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3.5, 2]} intensity={1.2} />
        <pointLight position={[0, 2.5, 0]} intensity={0.7} color="#fff4dd" />
        <BayShell tint={tint} />
        <ModuleProps moduleId={moduleId} />
        <SensorHead color={led} scanning={scanning} />
        <Co2Haze intensity={haze} />
        <RadSparks count={sparks} />
        {scanning ? (
          <mesh position={[0, 1.3, -0.2]} rotation={[0, 0, Math.PI / 2]}>
            <planeGeometry args={[2.2, 0.04]} />
            <meshStandardMaterial color="#7fd0ff" emissive="#7fd0ff" emissiveIntensity={2} transparent opacity={0.45} />
          </mesh>
        ) : null}
      </Canvas>
      <div className="sim-badge">Station sensor bay · simulated</div>
    </div>
  );
}
