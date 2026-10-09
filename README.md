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

## Wardrobe

Open **Phone → Wardrobe** to change your campus character. Campus Green and Casual Navy are free. Buy Ankara, Adire or Aso-oke-inspired outfits once with in-game money, then wear them for free. Low cut, afro, braids, locs and four skin tones are free. Turn the 3D preview to see your look. Appearance and owned outfits are included in the existing local save; older saves receive starter defaults without resetting progress.

Run `npm test` for the customisation regression tests and `npm run build` to check the production build.
