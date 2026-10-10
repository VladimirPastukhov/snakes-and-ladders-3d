import { Text } from "@react-three/drei";
import fredokaUrl from "@fontsource/fredoka/files/fredoka-latin-600-normal.woff?url";
import { COLORS, REGIONS, regionOf } from "./oz";
import type { Road } from "./road";

const SLAB_HEIGHT = 0.18;

/** Neutral land plus a patch of Region colour under every Cell. */
export function Ground({ road }: { road: Road }) {
  const discRadius = road.spacing * 1.35;
  const patches = [
    { position: road.start.position, region: REGIONS[0]! },
    ...road.cells.map((cell, i) => ({ position: cell.position, region: regionOf(i + 1)! })),
    { position: road.city.position, region: REGIONS[REGIONS.length - 1]! },
  ];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[20, 26]} />
        <meshLambertMaterial color={COLORS.baseGround} />
      </mesh>
      {patches.map(({ position, region }, i) => (
        <mesh
          key={i}
          rotation-x={-Math.PI / 2}
          // Each Region sits at its own tiny height so overlapping patches never flicker.
          position={[position.x, 0.002 * (REGIONS.indexOf(region) + 1), position.z]}
        >
          <circleGeometry args={[discRadius, 24]} />
          <meshLambertMaterial color={region.groundColor} />
        </mesh>
      ))}
    </group>
  );
}

/** A narrow brick path joining consecutive slabs, so the road's order is easy to follow. */
export function Path({ road }: { road: Road }) {
  const points = [road.start, ...road.cells, road.city].map((p) => p.position);
  const width = road.cellSize * 0.4;
  return (
    <group>
      {points.slice(1).map((to, i) => {
        const from = points[i]!;
        const length = from.distanceTo(to);
        const angle = Math.atan2(to.x - from.x, to.z - from.z);
        return (
          <mesh
            key={i}
            position={[(from.x + to.x) / 2, 0.03, (from.z + to.z) / 2]}
            rotation-y={angle}
          >
            <boxGeometry args={[width, 0.06, length]} />
            <meshLambertMaterial color={COLORS.path} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Round yellow-brick slabs with their numbers, all readable from the default view. */
export function Cells({ road }: { road: Road }) {
  const radius = road.cellSize / 2;
  return (
    <group>
      {road.cells.map(({ position }, i) => (
        <group key={i} position={[position.x, 0, position.z]}>
          <mesh position-y={SLAB_HEIGHT / 2}>
            <cylinderGeometry args={[radius, radius, SLAB_HEIGHT, 12]} />
            <meshLambertMaterial color={COLORS.road} />
          </mesh>
          <Text
            font={fredokaUrl}
            fontSize={radius * 0.95}
            color="#5a3b12"
            anchorX="center"
            anchorY="middle"
            rotation-x={-Math.PI / 2}
            position-y={SLAB_HEIGHT + 0.01}
          >
            {String(i + 1)}
          </Text>
        </group>
      ))}
    </group>
  );
}

/** Placeholder landmarks: Dorothy's farmhouse before Start, the Emerald City after Cell 30. */
export function Landmarks({ road }: { road: Road }) {
  const { farmhouse: house, city, spacing } = road;
  const towers = [
    [0, 0, 1.6],
    [-0.55, 0.3, 1.1],
    [0.55, 0.3, 1.2],
    [-0.3, -0.5, 0.9],
    [0.35, -0.5, 1.0],
  ] as const;
  return (
    <group>
      <group position={[house.x, 0, house.z]} rotation-y={0.4}>
        <mesh position-y={0.35}>
          <boxGeometry args={[0.9, 0.7, 0.8]} />
          <meshLambertMaterial color="#9b6b43" />
        </mesh>
        <mesh position-y={0.95} rotation-y={Math.PI / 4}>
          <coneGeometry args={[0.75, 0.5, 4]} />
          <meshLambertMaterial color="#6b3e26" />
        </mesh>
      </group>
      <group position={[city.position.x, 0, city.position.z - spacing * 0.4]}>
        {towers.map(([x, z, h], i) => (
          <mesh key={i} position={[x, h / 2, z]}>
            <boxGeometry args={[0.45, h, 0.45]} />
            <meshLambertMaterial color="#1f9d55" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Pawn({ color, x, z }: { color: string; x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.13, 0.22, 0.4, 10]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position-y={0.52}>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Both Tokens side by side at Start, across the road from each other. */
export function Tokens({ road }: { road: Road }) {
  const { position, tangent } = road.start;
  const side = { x: -tangent.z, z: tangent.x };
  const offset = road.cellSize * 0.32;
  return (
    <group>
      <Pawn
        color={COLORS.creatorToken}
        x={position.x + side.x * offset}
        z={position.z + side.z * offset}
      />
      <Pawn
        color={COLORS.joinerToken}
        x={position.x - side.x * offset}
        z={position.z - side.z * offset}
      />
    </group>
  );
}
