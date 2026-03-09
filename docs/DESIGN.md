# Design of 3D Pong

## Architecture

![High-level architecture diagram](./architecture.svg)

Our project has a backend written in Node.js using Express and a frontend
written in HTML, [EJS](https://ejs.co/), and JavaScript.

We use Google OAuth via Passport.js to authenticate users. User data is stored
in an SQLite database for simplicity.

Authenticated users create lobbies, which are managed by the backend with
`LobbyState`. For each lobby, `LobbyState` manages a `PongSocketServer`
(WebSocket server) and associated `ServerScene`. The `ServerScene` sends game
state updates over the WebSocket.

The client has a `PongSocketClient` (WebSocket client) that connects to the
associated server. It also has an `AnimatedScene` that communicates over the
WebSocket. The `AnimatedScene` manages the main game renderer (THREE.js).

`AnimatedScene` and `ServerScene` manage multiple `GameObjectBase`, which may
have physics objects and/or THREE.js visuals (on the frontend only). They both
own a `GameState` that owns a `PhysicsEngine`. The `PhysicsEngine` then manages
multiple `RigidBody`.

## Module design

### Game object abstraction

Each object in the game is abstracted into `GameObject`s. All game objects
derive from `GameObjectBase`. Many game objects have a "common" and client- or
server-specific version. This allows us to write critical game logic only once
and have it work on both the client and the server, making multiplayer
synchronization easier.

3D visuals are isolated to the client-specific implementations so the server
does not have to render anything.

### Physics engine

The physics engine implements its own math functions for structures like
quaternions and vectors.

It manages many rigid bodies which have a collision shape and mass.

Colliders can be spheres or convex polyhedra (e.g., cubes).

The main update of the physics engine happens through the `step` and
`checkColliders` functions.

On each step of the physics engine, all bodies are moved depending on their
force and velocity.

Collisions are checked using the Gilbert–Johnson–Keerthi (GJK) distance
algorithm. Then, resolution happens through the Expanding Polytope algorithm
(EPA).

Custom forces are applied to bodies using the `CustomForceApplier` classes.

### User profile system

We store user profiles in SQLite. Users make changes through the frontend via
API calls.

Items, items unlocked for each user, and items equipped for each user are stored
in the database and displayed in the frontend for users to select.

### Graphics

Graphics operate using the game object system.

The base scene has three lights for improved depth perception.

Customized ball and paddle skins use colors and textures.

Goal explosions are abstracted into JavaScript objects with custom fields and
methods, like those for shaders, particles, and geometry. They are then
instantiated and displayed by the `GoalAnimationSpawner`.

### Networking system

The networking system uses `PongSocketServer` and `PongSocketClient`, a thin
layer over WebSockets that pass messages using JSON.

The game object system provides a convenient way of collecting all network
synchronized objects and sending them from the server to the client in one
package.

The multiplayer networking is server-authoritative, so the clients cannot
cheat by teleporting their paddle around. Additionally, we implemented
client-side prediction and server reconciliation to compensate for higher
latency. This is achieved using physics engine abstractions.

## Design process

- The game objects system was created by Bobby in week 5 and refined to the
  current abstract class system by Wong in week 6 in preparation for multiplayer
  support.
- Bobby has managed physics engine development throughout the project. It was
  initially designed in week 3 based on Bobby's previous work.
- The database schema was initially designed by Jehmiah in week 5. Dennis
  expanded on the database system to build login and user profiles.
- Graphics have been managed primarily by Jehmiah with input from other team
  members. The current scene was developed to improve depth perception following
  feedback from the first MVP. The goal explosion system was created in week 5,
  refactored in week 7, and integrated into the main game by Bobby in week 8.
- The networking system was initialized by Terry and Chenchang in week 3, then
  the current abstraction was created by Wong. Bobby and Wong coordinated the
  design of the server-authoritative multiplayer networking following the MVP.
  The initial client-side prediction and server reconciliation was completed in
  week 8.

## User experience considerations

User flow:

- Log in using Google
- Go to profile and make adjustments, e.g., change display name and equip items
- Create a lobby, join a lobby by code, or join a public lobby
- Wait on waiting screen for enough players to join
- Host starts the game
- Try to win the game

(We plan to make UX improvements, such as improved styles, better navigation,
and a win condition, in the future.)
