import { BallCommon } from "../../public/game/common/BallCommon.js";
import * as Constants from "../../public/game/constants.js"

export class BallServer extends BallCommon {
    constructor(key, hitWallCallback) {
        super(key);

        this.body.col.onCollisionCallback = (me, other) => {
            if (!Object.hasOwn(other, 'ballIdentifier')) return;

            switch (other.ballIdentifier) {
                case 'paddle': {
                    const tinyV = this.body.v
                        .clone()
                        .normalize()
                        .scale(Constants.BALL_TINY_V_SCALE);
                    this.body.v.addVec(tinyV);

                    const rallySpeed = Math.max(
                        this.body.v.norm() + 0.3,
                        Constants.BALL_INITIAL_SPEED
                    );
                    this.body.v.normalize().scale(rallySpeed);

                    return;
                }

                case 'greenWall':
                    hitWallCallback(me, other);
                    this.needsToReset = true;
                    return;

                case 'redWall':
                    hitWallCallback(me, other);
                    this.needsToReset = true;
                    return;
            }
        };


    }
}