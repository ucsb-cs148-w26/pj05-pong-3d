export class AI {
    constructor(paddle, ball, paddles, speed = 15, axes = ['x', 'y']) {
        this.paddle = paddle;
        this.ball = ball;
        this.paddles = paddles;
        this.speed = speed;
        this.axes = axes;
        this.prevDist = Infinity;
        this.targetPaddle = null;
        this.targetOffset = { x: 0, y: 0 };
        this.wasApproaching = null;
        this.initialRotation = { x: paddle.rotation.x, y: paddle.rotation.y, z: paddle.rotation.z };
        this.currentLerp = 0;
        this.volleyCount = 0;
        this.difficultyMult = 0.2;
        this.positionError = { x: 0, y: 0 };
        this.maxRotation = 90;
    }

    update(delta) {
        const dist = Math.abs(this.paddle.position.z - this.ball.position.z);
        const isApproaching = dist < this.prevDist;

        if (isApproaching && !this.wasApproaching) {
            this.pickTarget();
        }
        this.wasApproaching = isApproaching;
        this.prevDist = dist;


        this.axes.forEach((axis) => {
            const target = isApproaching ? this.ball.position[axis] + this.positionError[axis] : 0;
            const current = this.paddle.position[axis];

            const range = 20;
            const t = Math.max(0, Math.min(1, 1 - dist / range));
            const responsiveness = isApproaching ? 0.1 + 0.9 * (t * t) : 0.1;
            const lerpFactor = Math.min(this.speed * delta * responsiveness, 1);
            this.paddle.position[axis] += (target - current) * lerpFactor;
        });

        if (this.targetPaddle) {
            let targetLerp = 0;
            const threshold = 10;
            if (isApproaching && dist < threshold) {
                const t = 1 - (dist / threshold);
                targetLerp = t * t * t * (t * (t * 6 - 15) + 10);
            }
            this.currentLerp += (targetLerp - this.currentLerp) * 10 * delta;

            const maxAngle = this.maxRotation * (Math.PI / 180);

            const tx = this.targetPaddle.position.x + this.targetOffset.x;
            const ty = this.targetPaddle.position.y + this.targetOffset.y;
            const tz = this.targetPaddle.position.z;

            const dx = tx - this.paddle.position.x;
            const dy = ty - this.paddle.position.y;
            const dz = tz - this.paddle.position.z;

            // Yaw
            const desiredY = Math.atan2(dx, dz);
            const baseY = this.paddle.position.z > 0 ? Math.PI : 0;
            let diffY = desiredY - baseY;
            while (diffY > Math.PI) diffY -= 2 * Math.PI;
            while (diffY < -Math.PI) diffY += 2 * Math.PI;
            let targetY = baseY + Math.max(-maxAngle, Math.min(maxAngle, diffY));

            // Pitch
            const distXZ = Math.sqrt(dx * dx + dz * dz);
            const desiredX = -Math.atan2(dy, distXZ);
            const targetX = Math.max(-maxAngle, Math.min(maxAngle, desiredX));

            let deltaY = targetY - this.initialRotation.y;
            while (deltaY > Math.PI / 2) { targetY -= Math.PI; deltaY -= Math.PI; }
            while (deltaY < -Math.PI / 2) { targetY += Math.PI; deltaY += Math.PI; }

            this.paddle.rotation.x = this.initialRotation.x + (targetX - this.initialRotation.x) * this.currentLerp;
            this.paddle.rotation.y = this.initialRotation.y + (targetY - this.initialRotation.y) * this.currentLerp;
        }
    }

    pickTarget() {
        this.volleyCount++;
        this.positionError.x = (Math.random() - 0.5) * this.volleyCount * this.difficultyMult;
        this.positionError.y = (Math.random() - 0.5) * this.volleyCount * this.difficultyMult;

        const others = this.paddles.filter((p) => p !== this.paddle);
        if (others.length > 0) {
            this.targetPaddle = others[Math.floor(Math.random() * others.length)];
            this.targetOffset.x = (Math.random() - 0.5) * 10;
            this.targetOffset.y = (Math.random() - 0.5) * 10;
        }
    }
}