// public/physics/integrations/paddleArenaIntegration.js
import { PhysicsEngine, RigidBody } from "../engine.js";
import { BoxCollider } from "../collider.js";
import { Vec3 } from "../math.js";

/**
 * Integrates PhysicsEngine with:
 *  - Arena: 6 static wall colliders (inside a box)
 *  - Paddles: kinematic colliders driven by mesh position
*/
export function initPaddleArenaPhysics({ arena, paddles, options = {},} = {}) {
    if (!arena?.mesh) throw new Error("initPaddleArenaPhysics: arena.mesh is required");
    if (!Array.isArray(paddles) || paddles.length === 0)
    throw new Error("initPaddleArenaPhysics: paddles[] is required");

    const engine = new PhysicsEngine();

    const cfg = {
        wallThickness: options.wallThickness ?? 2,
        staticMass: options.staticMass ?? 9999999,
    };

    const toVec3 = (threeVec) => new Vec3(threeVec.x, threeVec.y, threeVec.z);

    function registerBodyWithCollider(body) {
        engine.registerBody(body);
        engine.registerCollider(body.col);
        return body;
    }

    // --- build arena walls (6 boxes) ---
    const arenaGeo = arena.mesh.geometry;
    if (!arenaGeo?.parameters)
        throw new Error("Arena mesh geometry has no parameters; expected BoxGeometry");

        const arenaSizeX = arenaGeo.parameters.width;  // x
        const arenaSizeY = arenaGeo.parameters.height; // y
        const arenaSizeZ = arenaGeo.parameters.depth;  // z

        const hx = arenaSizeX / 2;
        const hy = arenaSizeY / 2;
        const hz = arenaSizeZ / 2;

        const t = cfg.wallThickness;

        const center = toVec3(arena.mesh.position);

        const walls = [];

        // Left / Right walls
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x - (hx + t / 2), center.y, center.z), t, arenaSizeZ, arenaSizeY)
                )
            )
        );
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x + (hx + t / 2), center.y, center.z), t, arenaSizeZ, arenaSizeY)
                )
            )
        );

        // Floor / Ceiling
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x, center.y - (hy + t / 2), center.z), arenaSizeX, arenaSizeZ, t)
                )
            )
        );
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x, center.y + (hy + t / 2), center.z), arenaSizeX, arenaSizeZ, t)
                )
            )
        );

        // Back / Front walls
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x, center.y, center.z - (hz + t / 2)), arenaSizeX, t, arenaSizeY)
                )
            )
        );
        walls.push(
            registerBodyWithCollider(
                new RigidBody(
                    cfg.staticMass,
                    new BoxCollider(new Vec3(center.x, center.y, center.z + (hz + t / 2)), arenaSizeX, t, arenaSizeY)
                )
            )
        );

    // --- paddles as kinematic bodies ---
    const paddleBodies = paddles.map((p) => {
        const geo = p.mesh.geometry;
        if (!geo?.parameters)
            throw new Error("Paddle mesh geometry has no parameters; expected BoxGeometry");

        const w = geo.parameters.width;   // x
        const h = geo.parameters.height;  // y
        const d = geo.parameters.depth;   // z

        const pos = toVec3(p.mesh.position);
        const body = registerBodyWithCollider(
            new RigidBody(cfg.staticMass, new BoxCollider(pos.clone(), w, d, h))
        );
        body.x = pos.clone();
        body.v = new Vec3(0, 0, 0);

        body.__lastPos = pos.clone();
        return body;
    });

    // --- public API ---
    function syncKinematics(dt) {
        for (let i = 0; i < paddleBodies.length; i++) {
            const body = paddleBodies[i];
            const mesh = paddles[i].mesh;
            const curr = toVec3(mesh.position);

            if (dt > 1e-6) {
                body.v = curr.clone().subVec(body.__lastPos).scale(1 / dt);
            } else {
                body.v = new Vec3(0, 0, 0);
            }
            
            const delta = curr.clone().subVec(body.__lastPos);
            body.__lastPos = curr.clone();
            body.x = curr.clone();
            body.col.applyTransform((v) => v.add(delta.x, delta.y, delta.z));

        }

    }

    function step(dt) {
        syncKinematics(dt);
        engine.step(dt);
        engine.checkColliders();
    }

    return {
        engine,
        walls,
        paddleBodies,
        step,
    };
}
