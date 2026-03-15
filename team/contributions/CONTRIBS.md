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
1. Added goal explosions system & shaders

## Bobby
1. Added physics engine and colliders

## Terry
1. Destructors on animated scene

## Ayala
1. Implemented the end-game condition logic to detect when a match has finished and transition the game into the appropriate end state. This prevents further gameplay actions once the win or completion criteria are met and allows the game to properly handle post-game behavior. Additionally, added functionality for players to leave lobbies by pressing the ESC key. This required handling keyboard input and integrating it with the lobby system to remove the player and return them to the appropriate screen.

## Chenchang
1. Stop user from joining full lobby
