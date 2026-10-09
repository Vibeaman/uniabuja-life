# Deploy UniAbuja Life to Vercel

The existing game is a static Vite/Three.js site. **No Supabase project, accounts, environment variables or backend are required to play.** Map, wardrobe, rooms and browser-local saves work as before.

1. Push these repository changes to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Select **Vite**. Use build command **`npm run build`**, output directory **`dist`**, and install command **`npm ci`**. `vercel.json` sets the build/output defaults. Set Root Directory to the folder containing `package.json` if the repository uses a subfolder.
4. Choose a currently supported Node.js version (22 or newer). Leave environment variables empty for the normal single-player game.
5. Click **Deploy**. Open the resulting HTTPS URL and start/continue your game. Future pushes to the linked production branch normally trigger a new deployment.

Local verification:

```sh
npm ci
npm test
npm run build
npm run preview
```

## Limits

- Saves live in the browser on that site's origin. A new Vercel/custom domain has separate storage; existing localhost/GitHub-hosted saves do not automatically transfer. No account or cloud save is required or provided.
- The game world is single-player and NPC/messages are simulated game notifications, not real player chats.
- `npm run presence` starts an optional **long-running** presence utility, not a Vercel serverless function. It is not deployed by this static configuration. Without a separately hosted `VITE_PRESENCE_URL`, production displays single-player mode and no invented online count. Do not add this variable just to make the game playable; it is unnecessary. Any optional external endpoint would need HTTPS, appropriate CORS and separate hosting.
- No deployment or external service setup has been performed automatically.
