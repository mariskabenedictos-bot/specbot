import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

export type RobotPhase = "idle" | "approach" | "scan" | "done" | "paused";

function BrightBay() {
  return (
    <group>
      {/* Floor with panel lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial color="#d6dee8" metalness={0.15} roughness={0.55} />
      </mesh>
      {[-1.5, 0, 1.5].map((z) => (
        <mesh key={`f${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[6.5, 0.03]} />
          <meshStandardMaterial color="#9aabbc" />
        </mesh>
      ))}
      {/* Back wall — bright ISS-like white/grey */}
      <mesh position={[0, 1.45, -1.55]}>
        <boxGeometry args={[6, 3.1, 0.12]} />
        <meshStandardMaterial color="#e8eef5" metalness={0.1} roughness={0.45} />
      </mesh>
      {/* Side walls */}
      <mesh position={[-2.6, 1.45, 0]}>
        <boxGeometry args={[0.12, 3.1, 3.6]} />
        <meshStandardMaterial color="#cfd8e4" />
      </mesh>
      <mesh position={[2.6, 1.45, 0]}>
        <boxGeometry args={[0.12, 3.1, 3.6]} />
        <meshStandardMaterial color="#cfd8e4" />
      </mesh>
      {/* Ceiling */}
      <mesh position={[0, 2.95, 0]}>
        <boxGeometry args={[6, 0.1, 3.6]} />
        <meshStandardMaterial color="#f2f6fb" />
      </mesh>
      {/* Bright ceiling lights */}
      {[-1.2, 0.4, 1.6].map((x) => (
        <mesh key={x} position={[x, 2.88, 0]}>
          <boxGeometry args={[1.1, 0.06, 0.45]} />
          <meshStandardMaterial color="#ffffff" emissive="#fff6e0" emissiveIntensity={1.6} />
        </mesh>
      ))}
      {/* Handrail */}
      <mesh position={[-1.9, 1.0, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.2, 12]} />
        <meshStandardMaterial color="#7a8ea3" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Storage racks */}
      <mesh position={[1.7, 1.2, -1.3]}>
        <boxGeometry args={[1.4, 2.0, 0.45]} />
        <meshStandardMaterial color="#b7c4d3" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[1.7, 1.5, -1.05]}>
        <boxGeometry args={[1.1, 0.55, 0.08]} />
        <meshStandardMaterial color="#8db4ff" emissive="#8db4ff" emissiveIntensity={0.25} />
      </mesh>
      {/* Window glow */}
      <mesh position={[-2.52, 1.6, 0.3]}>
        <boxGeometry args={[0.05, 0.9, 1.1]} />
        <meshStandardMaterial color="#9ec5ff" emissive="#6aa8ff" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/** Simple but recognisable human figure — female (Maya) vs male (Sam) variants. */
function AstronautFigure({ female }: { female: boolean }) {
  const skin = female ? "#efd0b4" : "#e0bd98";
  const suit = female ? "#e891b8" : "#3d6fd8";
  const suitDark = female ? "#c45f92" : "#2f4f8a";
  const hair = female ? "#2c1810" : "#1a1410";
  const pants = female ? "#8a4068" : "#2a3a55";
  return (
    <group position={[0.45, 0, -0.1]}>
      <mesh position={[-0.1, 0.38, 0]} castShadow>
        <capsuleGeometry args={[female ? 0.07 : 0.085, 0.42, 4, 10]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[0.1, 0.38, 0]} castShadow>
        <capsuleGeometry args={[female ? 0.07 : 0.085, 0.42, 4, 10]} />
        <meshStandardMaterial color={pants} />
      </mesh>
      <mesh position={[-0.1, 0.06, 0.04]}>
        <boxGeometry args={[0.14, 0.1, 0.22]} />
        <meshStandardMaterial color="#1a2433" />
      </mesh>
      <mesh position={[0.1, 0.06, 0.04]}>
        <boxGeometry args={[0.14, 0.1, 0.22]} />
        <meshStandardMaterial color="#1a2433" />
      </mesh>
      {/* Hips / waist */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[female ? 0.34 : 0.4, 0.18, 0.24]} />
        <meshStandardMaterial color={suitDark} />
      </mesh>
      {/* Torso — slightly narrower for female */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[female ? 0.36 : 0.44, female ? 0.5 : 0.55, 0.26]} />
        <meshStandardMaterial color={suit} />
      </mesh>
      <mesh position={[-0.28, 1.05, 0]} rotation={[0, 0, 0.28]} castShadow>
        <capsuleGeometry args={[0.055, female ? 0.34 : 0.4, 4, 10]} />
        <meshStandardMaterial color={suit} />
      </mesh>
      <mesh position={[0.28, 1.05, 0]} rotation={[0, 0, -0.28]} castShadow>
        <capsuleGeometry args={[0.055, female ? 0.34 : 0.4, 4, 10]} />
        <meshStandardMaterial color={suit} />
      </mesh>
      <mesh position={[-0.38, 0.78, 0.05]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0.38, 0.78, 0.05]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.38, 0]}>
        <cylinderGeometry args={[0.065, 0.075, 0.1, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        <sphereGeometry args={[female ? 0.15 : 0.165, 20, 20]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Hair cap */}
      <mesh position={[0, 1.68, -0.02]}>
        <sphereGeometry args={[female ? 0.145 : 0.14, 16, 16]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      {female ? (
        <>
          {/* Longer hair down the back and sides */}
          <mesh position={[0, 1.35, -0.12]} castShadow>
            <capsuleGeometry args={[0.11, 0.42, 4, 10]} />
            <meshStandardMaterial color={hair} />
          </mesh>
          <mesh position={[-0.12, 1.4, -0.05]} rotation={[0.2, 0, 0.35]}>
            <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
            <meshStandardMaterial color={hair} />
          </mesh>
          <mesh position={[0.12, 1.4, -0.05]} rotation={[0.2, 0, -0.35]}>
            <capsuleGeometry args={[0.06, 0.28, 4, 8]} />
            <meshStandardMaterial color={hair} />
          </mesh>
          <mesh position={[0, 1.15, -0.14]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={hair} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.7, -0.04]}>
          <boxGeometry args={[0.22, 0.06, 0.16]} />
          <meshStandardMaterial color={hair} />
        </mesh>
      )}
      <mesh position={[-0.05, 1.6, 0.13]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.05, 1.6, 0.13]}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 1.05, 0.15]}>
        <boxGeometry args={[0.2, 0.16, 0.05]} />
        <meshStandardMaterial color="#c5d0dc" metalness={0.4} roughness={0.35} />
      </mesh>
    </group>
  );
}

function ScanBeam({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current || !active) return;
    const t = performance.now() / 380;
    ref.current.position.y = 0.45 + ((Math.sin(t) + 1) / 2) * 1.25;
    (ref.current.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.sin(t * 2) * 0.12;
  });
  if (!active) return null;
  return (
    <mesh ref={ref} position={[0.05, 1.0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
      <planeGeometry args={[1.5, 0.035]} />
      <meshStandardMaterial color="#5ec8ff" emissive="#5ec8ff" emissiveIntensity={2} transparent opacity={0.4} />
    </mesh>
  );
}

/** Compact WALL-E inspired SPECC: boxy body, treads, binocular eyes on a neck. */
function WallERobot({ phase }: { phase: RobotPhase }) {
  const ref = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const glow = phase === "scan" ? "#f0b429" : phase === "approach" ? "#7fd0ff" : "#5dcea6";

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || phase === "paused") return;
    const goal =
      phase === "idle" ? new THREE.Vector3(-0.95, 0.02, 0.65) : new THREE.Vector3(-0.2, 0.02, 0.35);
    g.position.lerp(goal, Math.min(1, dt * 2.2));
    const target = new THREE.Vector3(0.45, 1.2, -0.1);
    const look = target.clone().sub(g.position);
    const yaw = Math.atan2(look.x, look.z);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, yaw, 0.08);
    if (neck.current) {
      neck.current.rotation.x = phase === "scan" ? Math.sin(performance.now() / 200) * 0.15 : -0.15;
      neck.current.rotation.y = phase === "scan" ? Math.sin(performance.now() / 320) * 0.2 : 0;
    }
    if (phase === "idle") {
      g.position.x += Math.sin(performance.now() / 900) * 0.0008;
    }
  });

  return (
    <group ref={ref} position={[-0.95, 0.02, 0.65]}>
      {/* Treads */}
      <mesh position={[-0.22, 0.12, 0]} castShadow>
        <boxGeometry args={[0.14, 0.22, 0.55]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      <mesh position={[0.22, 0.12, 0]} castShadow>
        <boxGeometry args={[0.14, 0.22, 0.55]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      {/* Body / cargo bay */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.55, 0.32, 0.48]} />
        <meshStandardMaterial color="#c45a12" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.44]} />
        <meshStandardMaterial color="#e07a28" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Status light */}
      <mesh position={[0, 0.4, 0.25]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.5} />
      </mesh>
      {/* Arms / scoops */}
      <mesh position={[-0.38, 0.35, 0.1]} rotation={[0.2, 0, 0.4]}>
        <boxGeometry args={[0.1, 0.08, 0.32]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.38, 0.35, 0.1]} rotation={[0.2, 0, -0.4]}>
        <boxGeometry args={[0.1, 0.08, 0.32]} />
        <meshStandardMaterial color="#9a9a9a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Neck + binocular head */}
      <group ref={neck} position={[0, 0.58, -0.05]}>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.22, 10]} />
          <meshStandardMaterial color="#6a6a6a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.12, 0.28, 0.08]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.16, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.12, 0.28, 0.08]} rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.1, 0.16, 16]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} roughness={0.35} />
        </mesh>
        {/* Lenses */}
        <mesh position={[-0.12, 0.28, 0.17]}>
          <circleGeometry args={[0.07, 20]} />
          <meshStandardMaterial color="#7fd0ff" emissive="#4aa0ff" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0.12, 0.28, 0.17]}>
          <circleGeometry args={[0.07, 20]} />
          <meshStandardMaterial color="#7fd0ff" emissive="#4aa0ff" emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0.28, 0.02]}>
          <boxGeometry args={[0.1, 0.06, 0.08]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      </group>
      {phase === "scan" ? (
        <mesh position={[0.15, 0.7, 0.2]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.35, 0.035, 0.035]} />
          <meshStandardMaterial color="#f0b429" emissive="#f0b429" emissiveIntensity={1.4} />
        </mesh>
      ) : null}
    </group>
  );
}

function FollowCam({ phase }: { phase: RobotPhase }) {
  useFrame((state) => {
    const scanning = phase === "scan" || phase === "done";
    const want = scanning
      ? new THREE.Vector3(1.35, 1.45, 2.35)
      : new THREE.Vector3(1.7, 1.55, 2.7);
    state.camera.position.lerp(want, 0.05);
    state.camera.lookAt(0.05, 1.05, 0);
  });
  return null;
}

export function RobotScene({
  phase,
  female = true,
}: {
  name?: string;
  phase: RobotPhase;
  statusText?: string;
  female?: boolean;
}) {
  return (
    <div className="robot-canvas closeup">
      <Canvas shadows camera={{ position: [1.7, 1.55, 2.7], fov: 38 }}>
        <color attach="background" args={["#b8c7d8"]} />
        <ambientLight intensity={0.85} />
        <directionalLight castShadow position={[2.2, 4.2, 2.5]} intensity={1.35} shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 2.6, 0.2]} intensity={0.9} color="#fff4dd" />
        <hemisphereLight args={["#ffffff", "#9aabbc", 0.55]} />
        <BrightBay />
        <AstronautFigure female={female} />
        <WallERobot phase={phase} />
        <ScanBeam active={phase === "scan"} />
        <FollowCam phase={phase} />
        <ContactShadows opacity={0.35} scale={8} blur={2} far={5} color="#4a5564" />
      </Canvas>
      <div className="sim-badge">Simulated scan</div>
    </div>
  );
}
