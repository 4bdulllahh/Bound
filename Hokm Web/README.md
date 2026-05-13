# Bound Card Game — Online Multiplayer Website

This is a deploy-ready real-time web app for your custom 4-player team card game.

## What is included

- 4-player online rooms with a room code
- Opposite players are teammates
- Custom 36-card deck:
  - 6–A of Spades
  - 6–A of Hearts
  - 7–A of Clubs
  - 7–A of Diamonds
  - Black Joker and Red Joker
- 9 cards dealt to each player
- Shuffler/cutter flow
- Bidding with numbers only
- Skip bidding
- Everyone-skip reshuffle rule
- Winning bidder chooses the power suit
- Player to the right of bidding winner starts the first trick
- Follow-suit rule
- Power suit/trump rule
- Black Joker and Red Joker rules
- Illegal Joker penalty: other team gets 15 points
- Successful/failed bid scoring
- First team to 54 wins
- Bound during bidding or before completing original bid

## Run locally

You need Node.js installed.

```bash
npm run install:all
npm run dev
```

Then open:

```bash
http://localhost:5173
```

Open the room in 4 browser tabs or send the room code to friends on the same deployed website.

## Production build

```bash
npm run install:all
npm run build
npm start
```

The app will run on:

```bash
http://localhost:3001
```

## Deployment

This app uses WebSockets through Socket.IO, so deploy it to a platform that supports persistent Node.js servers and WebSockets.

Good options include:

- Render
- Railway
- Fly.io
- A VPS

For most platforms:

- Build command: `npm run install:all && npm run build`
- Start command: `npm start`
- Port: use the platform-provided `PORT` environment variable

## Important note

I made the website fully playable, but because the game rules were described naturally, a few interpretations were needed:

1. The player to the right means the next clockwise seat.
2. If a player must follow suit, they cannot play a different normal suit while holding the trick suit.
3. Jokers cannot lead a trick.
4. Black Joker after trick 3 and Red Joker in trick 9 trigger the 15-point penalty.
5. Red Joker before Black Joker is blocked as an invalid move.
6. Bound during play is allowed only if the bidding team has won every completed trick so far and has not yet completed its original bid.

You can adjust these easily in `server/index.js`.
