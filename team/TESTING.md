## Testing library experimented with
Jest

## Approach experimented with
We experimented with using Unit-testing with our math & physics implementations. We decided that this portion of our code-base was particularly important to test because correct physics implementations are very important for the gameplay to be fun. 

## Unit tests implemented
We created tests for public/physics/math.js in public/physics/math.test.js

- We Implemented tests for:
  - Vector: normalize, norm, and dot.
  - Quaternion: fromAxisAngle and rotateVec3InPlace.

## How to run
We set up our package.json so tests can be run by typing: npm test
