import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { Quaternion, Vector3 } from "three";
import { arcTop, type JumpArc } from "./arcs";
import { COLORS, EVENT_NAMES } from "./oz";

interface Props {
  arcs: JumpArc[];
  /** Start Cell of the arc whose Event Name is shown, if any. */
  selected: number | null;
  onSelect: (from: number | null) => void;
}

const UP = new Vector3(0, 1, 0);

export function JumpArcs({ arcs, selected, onSelect }: Props) {
  return (
    <group>
      {arcs.map((arc) => {
        const { jump, curve } = arc;
        const color = jump.kind === "ladder" ? COLORS.ladder : COLORS.snake;
        const end = curve.getPoint(1);
        const heading = new Quaternion().setFromUnitVectors(UP, curve.getTangent(1));
        const select = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
          e.stopPropagation();
          onSelect(jump.from);
        };
        return (
          <group key={jump.from}>
            <mesh>
              <tubeGeometry args={[curve, 48, 0.07, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            <mesh position={end} quaternion={heading}>
              <coneGeometry args={[0.2, 0.45, 12]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
            {/* Thick invisible tube: an easier target for fingers than the thin visible one. */}
            <mesh
              onPointerOver={select}
              onPointerOut={(e) => {
                if (e.pointerType === "mouse") onSelect(null);
              }}
              onClick={select}
            >
              <tubeGeometry args={[curve, 24, 0.3, 6]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {selected === jump.from && (
              <Html position={arcTop(arc)} center className="event-label" zIndexRange={[10, 0]}>
                {EVENT_NAMES[jump.from]}
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
