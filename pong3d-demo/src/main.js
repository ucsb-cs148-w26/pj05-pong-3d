import * as THREE from "three";

/**
 * Tomorrow-ready demo:
 * - A cube arena (wireframe)
 * - A ball starts with random direction
 * - Ball bounces via sphere-plane collisions + velocity reflection
 * - Uses THREE.Vector3 (no custom math framework needed)
 */

// ---------- Scene basics ----------
const app = document.getElementById("app");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(10, 7, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// lights (keep simple but visible)
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(6, 10, 6);
scene.add(dir);

// ---------- Arena ----------
const HALF = 5; // cube spans [-HALF, HALF] in x/y/z
const arenaGeom = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);
const arenaEdges = new THREE.EdgesGeometry(arenaGeom);
const arenaLine = new THREE.LineSegments(
  arenaEdges,
  new THREE.LineBasicMaterial({ color: 0x8a7dff })
);
scene.add(arenaLine);

// Optional: faint grid for depth cue
const grid = new THREE.GridHelper(20, 20, 0x223344, 0x223344);
grid.position.y = -HALF;
scene.add(grid);

// ---------- Ball ----------
const BALL_R = 0.35;

const ballMesh = new THREE.Mesh(
  new THREE.SphereGeometry(BALL_R, 32, 24),
  new THREE.MeshStandardMaterial({
    color: 0xff5fd7,
    roughness: 0.35,
    metalness: 0.1,
    emissive: 0x190016,
    emissiveIntensity: 0.9,
  })
);
scene.add(ballMesh);

const ball = {
  pos: new THREE.Vector3(0, 0, 0),
  vel: new THREE.Vector3(0, 0, 0),
  radius: BALL_R,
  speed: 6.0, // units per second
};

// ---------- Planes (6 faces of the cube) ----------
/**
 * Plane representation:
 * - n: unit normal pointing inward? We'll define normals pointing *inward* to the playable volume.
 * - p0: a point on the plane
 *
 * For a cube volume, inward normals are:
 *  +X face at x=+HALF has inward normal (-1,0,0)
 *  -X face at x=-HALF has inward normal ( 1,0,0)
 *  +Y face at y=+HALF has inward normal (0,-1,0)
 *  -Y face at y=-HALF has inward normal (0, 1,0)
 *  +Z face at z=+HALF has inward normal (0,0,-1)
 *  -Z face at z=-HALF has inward normal (0,0, 1)
 */
const planes = [
  { n: new THREE.Vector3(-1, 0, 0), p0: new THREE.Vector3(HALF, 0, 0) },  // +X wall
  { n: new THREE.Vector3( 1, 0, 0), p0: new THREE.Vector3(-HALF, 0, 0) }, // -X wall
  { n: new THREE.Vector3( 0,-1, 0), p0: new THREE.Vector3(0, HALF, 0) },  // +Y wall
  { n: new THREE.Vector3( 0, 1, 0), p0: new THREE.Vector3(0,-HALF, 0) },  // -Y wall
  { n: new THREE.Vector3( 0, 0,-1), p0: new THREE.Vector3(0, 0, HALF) },  // +Z wall
  { n: new THREE.Vector3( 0, 0, 1), p0: new THREE.Vector3(0, 0,-HALF) },  // -Z wall
];

// ---------- Utilities ----------
function randomDirection(minComponentAbs = 0.25) {
  // Rejection sample: avoid near-zero components to keep motion interesting
  while (true) {
    const v = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2),
      THREE.MathUtils.randFloatSpread(2)
    );
    if (v.lengthSq() < 1e-6) continue;
    v.normalize();

    if (
      Math.abs(v.x) >= minComponentAbs ||
      Math.abs(v.y) >= minComponentAbs ||
      Math.abs(v.z) >= minComponentAbs
    ) {
      return v;
    }
  }
}

function resetBall() {
  ball.pos.set(0, 0, 0);
  const dir = randomDirection(0.35);
  ball.vel.copy(dir).multiplyScalar(ball.speed);
}
resetBall();

// ---------- Collision: sphere vs plane ----------
/**
 * Signed distance (inward normal):
 * d = (p - p0) · n
 * Since n points inward, d should be >= 0 for points inside the volume.
 * Collision when d < r (sphere intersects plane), and ball is moving *toward* the plane:
 * v · n < 0 would mean moving opposite to normal, but with inward normals:
 * - If you move toward the plane from inside, you move in direction -n (since n points inward).
 * So "moving toward plane" => v · n < 0.
 */
const tmp = new THREE.Vector3();
function collideSphereWithPlane(pos, vel, radius, plane) {
  tmp.copy(pos).sub(plane.p0);
  const d = tmp.dot(plane.n);           // signed distance to plane along inward normal
  const vn = vel.dot(plane.n);          // velocity component along inward normal

  // If sphere penetrates and is moving toward the plane, resolve
  if (d < radius && vn < 0) {
    // Push out so it's exactly touching:
    const correction = radius - d;
    pos.addScaledVector(plane.n, correction);

    // Reflect velocity: v' = v - 2*(v·n)*n
    vel.addScaledVector(plane.n, -2 * vn);

    // tiny damping prevention for jitter (optional)
    // vel.multiplyScalar(0.999);
    return true;
  }
  return false;
}

// ---------- Animation loop ----------
const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033); // clamp dt to avoid huge jumps
  // Integrate
  ball.pos.addScaledVector(ball.vel, dt);

  // Collide against all 6 planes
  for (const p of planes) {
    collideSphereWithPlane(ball.pos, ball.vel, ball.radius, p);
  }

  // Sync mesh
  ballMesh.position.copy(ball.pos);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

// ---------- Input ----------
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") {
    resetBall();
  }
});

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
