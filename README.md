# UniAbuja Life

A 3D campus life game set at the University of Abuja, built with Three.js and Vite.

```bash
npm install
npm run dev   # http://localhost:5173
```

Controls: WASD/arrows to move, Shift to run, drag to look, scroll to zoom, E to enter buildings or chat. On phones: joystick plus drag.

## Features

- Pick your faculty, department and where you live: one of the five hostels (Old Boys, Old Girls, New Girls, International, Postgraduate) or an off-campus lodge in Giri, Iddo or Gwagwalada.
- Each department has its own weekly timetable. Lectures only count at your faculty during your slots.
- Keke rides around campus (₦100) and to Giri, Iddo and Gwagwalada.
- Phone (press P): guided campus map with directions, real Google Map of the area, timetable, keke, wallet, messages and players online.

## Players online

```bash
npm run presence   # tiny presence server on :8787 (dev server proxies /presence to it)
```

In production, set `VITE_PRESENCE_URL` to the hosted presence endpoint. Without it the game shows "Offline mode".
