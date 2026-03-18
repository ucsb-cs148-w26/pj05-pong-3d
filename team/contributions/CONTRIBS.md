# Contributions

## Dennis
1. Extended Database to allow for item unlocks

## Wong

1. Created initial project structure
2. Created initial chat functionality
3. Implemented system of creating and joining lobbies using lobby code
4. Refactored game object system for code reuse between server and client
5. Implemented initial two-player multiplayer functionality (without client-side
   prediction)
6. Refactored and improved stylesheets for the game UI
7. Implemented automatically refreshing lobby list
8. Implemented configurable number of lives

## Jehmiah
1. Added initial database design
2. Added goal explosions system & shaders
3. Added paddle skin system & shaders
4. Added ball skin system & shaders
5. Added arena visuals & shaders
6. Added initial AI opponent (deprecated)
7. Created mocks for initial gameplay pattern 

## Bobby
1. Added physics engine and colliders

## Terry
1. Implemented websocket networking for communication between the client and server.
2. Created the server state object to manage the physics engine, paddle positions, and overall game state.
3. Implemented client-side latency measurement to track ping between the client and server.
4. Added advanced lobby system features, including host controls and improved lobby management.
5. Cleaned up the animated scene system by improving object deletion and lifecycle management.
6. Integrated goal explosion effects into gameplay.
7. Added camera shake effects to improve game feedback and visual impact.
8. Implemented the item acquisition system to allow players to unlock items.

## Ayala
1. Implemented the end-game condition logic to detect when a match has finished and transition the game into the appropriate end state. This prevents further gameplay actions once the win or completion criteria are met and allows the game to properly handle post-game behavior. Additionally, added functionality for players to leave lobbies by pressing the ESC key. This required handling keyboard input and integrating it with the lobby system to remove the player and return them to the appropriate screen.

## Chenchang
1. Stop user from joining full lobby
