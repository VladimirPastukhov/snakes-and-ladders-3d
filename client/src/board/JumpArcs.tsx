import { Quaternion, Vector3 } from "three";
import type { JumpArc } from "./arcs";
import { COLORS } from "./oz";

const UP = new Vector3(0, 1, 0);

/** Each Snake and Ladder as a glowing arc with a cone at its destination. */
export function JumpArcs({ arcs }: { arcs: JumpArc[] }) {
  return (
    <group>
      {arcs.map(({ jump, curve }) => {
        const color = jump.kind === "ladder" ? COLORS.ladder : COLORS.snake;
        const heading = new Quaternion().setFromUnitVectors(UP, curve.getTangent(1));
        return (
          <group key={jump.from}>
            <mesh>
              <tubeGeometry args={[curve, 48, 0.07, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position={curve.getPoint(1)} quaternion={heading}>
              <coneGeometry args={[0.2, 0.45, 12]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
