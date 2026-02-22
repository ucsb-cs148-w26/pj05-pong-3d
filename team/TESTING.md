## Testing library experimented with
Jest

## Approach experimented with
We experimented with using Unit-testing with our math & physics implementations. We decided that this portion of our code-base was particularly important to test because correct physics implementations are very important for the gameplay to be fun. 

## Unit tests implemented
We created tests for public/physics/math.js in public/physics/math.test.js

- We Implemented tests for:
  - Vector: normalize, norm, and dot.
  - Quaternion: fromAxisAngle and rotateVec3InPlace.

## Integration test implemented
We created an end-to-end test for the physics engine. This is simultaneously testing the colliders and transform logc, dynamics (differential equation solver) logic, collision check logic, collision resolution logic, and collision callback logic all in one comprehensive tests via a simple Physics simulation. We spawn 4 cubes each with width/length/height of 1 all on the same line, and direct the inner two blocks to have velocity towards each other. It looks like:
[]   []-->   <--[]   []
There should be a total of three collisions given the proper velocity, following this flow:
[]   []-->   <--[]   [] 0 init
[]   <--[][]-->   [] 1 collision
<--[][]-->   <--[][]--> 2 collision (two at the same time)
<--[]  <--[][]--> []--> 3 collision; float forever after

## How to run
We set up our package.json so tests can be run by typing: `npm test`

## Plans regarding Unit Tests going forward
We plan to continue using Jest for logic-focused tests.
We prioritize testing critical gameplay functions where logic correctness matters.
Later on, since testing rendering with Three.js isn't practical with Jest, we might have to come up with different methods to test it.

## How we satisfied component/integration/e2e testing
We again used Jest to perform **integration** testing for lab06.
The detail is explained in the [Integration tests implemented](#integration-tests-implemented) section above.

## Plans regarding higher-level testing going forward
We are strongly considering using Cypress for full E2E tests in the future.
Cypress is great with automated testing and user interaction, including canvas-based games, which applies to our case.
However, if we decide Cypress is too complex, we might stick to Jest-based integration tests without full E2E complexity.
