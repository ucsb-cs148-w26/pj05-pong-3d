
export class Drag {

    constructor( dragCoefficient, bodies ) {
        this.k = dragCoefficient;
        this.bodies = bodies;
    }

    applyForce() {
        for ( let i = 0; i < this.bodies.length; i++ ) {
            const v = this.bodies[i].v.clone();
            v.scale( -this.k );
            this.bodies[i].f.addVec( v );
        }

    }

}

export class Gravity {
    constructor( gravity, bodies ) {
        this.g = gravity;
        this.bodies = bodies;
    }

    applyForce() {
        for ( let i = 0; i < this.bodies.length; i++ ) { 
            const weight = this.g * this.bodies[i].m;
            this.bodies[i].f.y -= weight;
        }
    }
    
}