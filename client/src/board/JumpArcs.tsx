import { Quaternion, Vector3 } from "three";
import { arrowheads, type JumpArc } from "./arcs";
import { COLORS } from "./oz";
import type { Road } from "./road";

const UP = new Vector3(0, 1, 0);
const pointing = (direction: Vector3) => new Quaternion().setFromUnitVectors(UP, direction);

/**
 * Each Snake and Ladder as a glowing arc with a cone at its destination, arrowheads along it
 * pointing the same way, and a ring around the Cell where it starts, so its direction reads at
 * a glance.
 */
export function JumpArcs({ road, arcs }: { road: Road; arcs: JumpArc[] }) {
  const ring = road.cellSize / 2;
  return (
    <group>
      {arcs.map((arc) => {
        const { jump, curve } = arc;
        const color = jump.kind === "ladder" ? COLORS.ladder : COLORS.snake;
        const start = road.cells[jump.from - 1]!.position;
        return (
          <group key={jump.from}>
            <mesh>
              <tubeGeometry args={[curve, 48, 0.07, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position={curve.getPoint(1)} quaternion={pointing(curve.getTangent(1))}>
              <coneGeometry args={[0.2, 0.45, 12]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {arrowheads(arc).map(({ position, direction }, i) => (
              <mesh key={i} position={position} quaternion={pointing(direction)}>
                <coneGeometry args={[0.24, 0.44, 10]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
            ))}
            <mesh position={[start.x, 0.03, start.z]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[ring * 1.06, ring * 1.32, 32]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
