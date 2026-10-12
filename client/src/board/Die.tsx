import { RoundedBox } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import { DIE_FACES, DIE_SIZE } from "./turnMotion";

/** Pip positions on a face, in units of the pip spacing, for each value. */
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

const FACE_OUT = new Vector3(0, 0, 1);
const PIP_SPACING = DIE_SIZE * 0.26;
const PIP_RADIUS = DIE_SIZE * 0.09;

/** An ivory die with dark pips; each value sits on the face given by `DIE_FACES`. */
export function Die() {
  return (
    <group>
      <RoundedBox args={[DIE_SIZE, DIE_SIZE, DIE_SIZE]} radius={DIE_SIZE * 0.14} smoothness={3}>
        <meshLambertMaterial color="#fbf6e6" />
      </RoundedBox>
      {Object.entries(DIE_FACES).map(([value, normal]) => (
        <group key={value} quaternion={new Quaternion().setFromUnitVectors(FACE_OUT, normal)}>
          {PIPS[Number(value)]!.map(([u, v], i) => (
            <mesh key={i} position={[u * PIP_SPACING, v * PIP_SPACING, DIE_SIZE / 2 + 0.002]}>
              <circleGeometry args={[PIP_RADIUS, 16]} />
              <meshBasicMaterial color={Number(value) === 1 ? "#b3261e" : "#3a2a1a"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
