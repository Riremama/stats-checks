# Stats Checks — booking-code lookup fix

## What changed
- The booking-code button now calls a backend route instead of only displaying a demo message.
- The backend calls SportyBet's observed web endpoint and returns the slip selections to the page.
- Clear errors are shown for missing/invalid codes, lookup failures, unexpected responses, and when the server is not running.
- The existing manual historical hit-rate calculator remains a manual calculation; it is not connected to live match history.

## Run locally
1. Install Node.js 18 or newer.
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm start`
5. Open `http://localhost:3000` in your browser.
6. Paste your SportyBet booking code and press **Load & analyse code**.

Important: open the site through `http://localhost:3000`. Do not open `public/index.html` directly as a file, because the API route needs the server.

## Deploy
Deploy this Node/Express app to a host that supports a persistent Node web service. Set the service start command to `npm start`. If hosting on a platform that separates static frontend and backend, configure the frontend's API URL to the deployed backend (the current frontend assumes same-origin `/api/booking/...`).

## Important limitations
- SportyBet does not publish an official public developer API for this feature. This implementation uses an undocumented web endpoint that can change or be blocked; it is a best-effort integration, not a guarantee.
- A valid code can be expired, region-specific, or no longer available.
- Booking-code lookup only loads the selections. It does not supply verified historical results, odds movement, or a reliable prediction engine.
- Do not interpret a 9/10 historical hit rate as a 90% chance of winning the next event.
- The app never places bets or asks for passwords, PINs, OTPs, or payment information.
