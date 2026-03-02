# Sprint04 planning meeting

- Meeting time: 3/2/2026
- Meeting type: Sprint planning
- Team: All present

Discussion:

# Planned Game Improvements and System Redesign

## 1. Gameplay Flow Redesign

We will replace the current ball spawning system with a structured round-based flow:

- Each round begins with a **3–2–1 countdown**
- A clear **“GOAL” animation** plays when a point is scored
- The player who gets scored on will take the kickoff in the next round
- Implement a defined win condition (e.g., **first to X points wins**)

Once a match starts:
- The number of players becomes fixed
- Players cannot join mid-game
- A **forfeit/leave option** will be available (leaving counts as a loss)

---

## 2. Ranking & Competitive System

We will introduce a full **Elo-based ranking system** (implemented by Dennis):

- Elo calculation and rating updates after each match
- Elo visible in:
  - Player profile section
  - In-game UI
- A dedicated **Leaderboard page** displaying top-ranked players

---

## 3. Customization & Unlockables

We plan to expand cosmetic and progression systems:

- Skin preview system before equipping
- Unlockable:
  - Goal skins
  - Goal explosions
  - Additional cosmetic effects
- Progression-based reward system tied to gameplay

---

## 4. Lobby System Improvements

The current lobby system occasionally breaks when joining. We will:

- Redesign the frontend for the join lobby system
- Improve backend stability and error handling
- Prevent mid-game joins once a match has started
- Make the lobby system more robust overall

---

## 5. UI/UX & Visual Improvements

- Create new stylesheets to improve visual consistency and design quality
- Remake parts of the frontend for better structure and usability
- Adjust in-game camera motion to reduce motion sickness and improve player comfort
- Improve overall polish and animations

---

## Overall Goal

These improvements aim to:

- Create a structured and competitive gameplay experience
- Improve system reliability
- Introduce ranking and progression mechanics
- Enhance visual polish and user experience
- Increase long-term player engagement