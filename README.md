# UniAbuja Life

A 3D campus life game set at the University of Abuja, built with Three.js and Vite.

**Deploy to Vercel:** see [DEPLOYMENT.md](DEPLOYMENT.md). This is a static Vite site: build `npm run build`, output `dist`. **No account service, Supabase or environment variables are required to play.**

```bash
npm install
npm run dev   # http://localhost:5173
```

Controls: **tap/click a spot or building to walk there automatically**. Open **Map** (or press **M**, or tap the minimap) for the playable campus layout and destination list. Routes avoid buildings, trees, poles and vehicles; building taps target their entrance. Tap **Stop** or use WASD/arrows/joystick to cancel automatic walking. At an entrance, tap the prompt or press **E** to enter. Drag to orbit, scroll or use **＋/−** to zoom, and toggle **Aerial / Follow view**. Shift runs while walking manually. **P** opens the phone. On mobile, the bottom dock opens **My Room**, **Buy** (room furnishings), **Map**, and **Phone**.

## Features

- Pick your faculty, department and where you live: one of the five hostels (Old Boys, Old Girls, New Girls, International, Postgraduate) or an off-campus lodge in Giri, Iddo or Gwagwalada.
- Each department has its own weekly timetable. Lectures only count at your faculty during your slots.
- Keke rides around campus (₦100) and to Giri, Iddo and Gwagwalada.
- Default aerial camera, adjustable zoom and a follow-view toggle. Tap navigation is available directly in the 3D world and gameplay map.
- Furnished isometric cutaway interiors for hostels, faculties, library, cafeteria, Senate, SUG and health centre. Enter at an outdoor entrance, tap furniture to walk through the clear aisle and choose the relevant existing game action, then **Exit to campus**. Accessible station buttons and a plan-view toggle are also available. These are stylized game rooms, not surveyed university interiors.
- Phone (press P): gameplay map with automatic walking, a separate offline geographic reference map (OpenStreetMap-derived outlines), timetable, keke, wallet, messages and optional live presence. Real geographic reference points are not the same as the simplified 3D game coordinates.

## Players online

```bash
npm run presence   # tiny presence server on :8787 (dev server proxies /presence to it)
```

Vercel hosts the static game, not this long-running server. Production works without it and shows single-player mode, with no fabricated online count. Optionally set `VITE_PRESENCE_URL` only if you separately host a compatible HTTPS presence endpoint. No backend is required for gameplay.

## Wardrobe

Open **Phone → Wardrobe** to change your campus character. Campus Green and Casual Navy are free. Buy Ankara, Adire or Aso-oke-inspired outfits once with in-game money, then wear them for free. Low cut, afro, braids, locs and four skin tones are free. Turn the 3D preview to see your look. Appearance and owned outfits are included in the existing local save; older saves receive starter defaults without resetting progress.

Run `npm test` for the customisation regression tests and `npm run build` to check the production build.

## Room decorating

Open **Phone → My Room**, or enter your own hostel/lodge and choose **Decorate my room**. The 3D diorama shows your furniture, wall colour and layout. You can view your room from anywhere, but must be at your own hostel entrance or off-campus lodge to edit it.

- A mattress, study table and plastic chair come free with your room.
- Buy beds, desks, an armchair, rugs, lamps, a plant, a bookshelf and wall art with in-game money. Purchases are owned permanently; replacing or storing an item does not sell it. Place owned items again for free.
- Four wall colours and three arrangements (Cosy corner, Study zone, Open centre) are free. Furniture uses designated spots rather than free dragging.
- Designs are saved per residence in the existing browser save. Furniture is cosmetic and does not change needs or academic results. The personalized 3D room-design preview is separate from the interactive, generic furnished building cutaways. No multiplayer invitation system is provided.
