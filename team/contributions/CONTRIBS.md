# Contributions

## Dennis
1. Created initial lobby system structure
2. Implemented user authentication system using Google OAuth
3. Extended Database to allow for item unlocks
4. Created user page where users can see their information and change their nickname
5. Added previews for items in the user page
6. Implemented ELO system and included the ELO visibility/updates in all relevant locations
7. Created leaderboard page
8. Implemented random matchmaking

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
1. Built a small math framework upon which the physics and dynamics work upon 
2. Developed a physics engine completely from scratch via physics algorithms like GJK, EPA, and real-time ordinary differential equation solver
3. Created the initial structure and abstraction hierarchy of the GameObject and Scene interactions, replacing all of the previous tech debt in favor of scalability
4. Built initial project functionality using my personally made physics engine in combination with Jehmiah's graphics for working functionality
5. Refactored the system into a central State object for network interaction and scalability
6. Developed and integrated client-side prediction as the primary form of lag compensation, allowing the client to simulate real-time physics while awaiting server responses, improving latency feel
7. Integrated visual systems allowing for players to view the cosmetics of other players via client-side collision detection for visuals only, and server-side collision detection for game state updates
8. Built the spectator system allowing for several spectators to join and watch full lobbies from different perspectives via OrbitControls
9. Built the waiting and join screen mechanics for a more intuitive game experience

## Terry
1. Implemented websocket networking for communication between the client and server.
2. Implemented client-side latency measurement to track ping between the client and server.
3. Cleaned up the animated scene system by improving object deletion and lifecycle management.
4. Added camera shake effects to improve game feedback and visual impact.
5. Implemented the item acquisition system to allow players to unlock items.

## Ayala
1. Implemented the end-game condition logic to detect when a match has finished and transition the game into the appropriate end state. This prevents further gameplay actions once the win or completion criteria are met and allows the game to properly handle post-game behavior. Additionally, added functionality for players to leave lobbies by pressing the ESC key. This required handling keyboard input and integrating it with the lobby system to remove the player and return them to the appropriate screen.

## Chenchang
1. Improved the styling and overall usability of the lobby page.
2. Fixed chat auto-scrolling to improve the messaging experience.
3. Improved lobby cleanup so empty lobbies are removed immediately after all players leave.
4. Redesigned the HUD by adding a centered scoreboard and an FPS/ping panel while removing unnecessary debug information.
5. Updated the waiting screen to provide clearer feedback for non-host players.
6. Strengthened the lobby system by preventing users from joining or viewing full and in-progress lobbies.
