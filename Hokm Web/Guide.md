🃏 How to Play Bound Online (Quick Start)
Welcome! This guide will help you get the game running on your computer so you can play with your friends. Don't worry, you don't need to be a coder to do this.

1. Prerequisites
Before we start, you need one tool installed on your computer. It’s what runs the game "engine."

Download Node.js: Go to nodejs.org and download the "LTS" version.

Install it: Run the installer and just click "Next" until it’s finished.

2. Setting Up the Game
Once you have the game files from GitHub, follow these 3 simple steps:

Step A: Open the Game Folder
Open the folder where the game files are located.

In the address bar at the top of your folder window, type cmd and press Enter. A black window (Terminal) will pop up.

Step B: Install the "Brains"
In that black window, type the following and press Enter:

Bash
npm run install:all

Wait for it to finish. It is downloading the necessary files for the game to work.

Step C: Start the Game
Now, type this and press Enter:

Bash
npm run dev
The window will stay open—don't close it! This is your local game server.

3. How to Connect
Open your web browser (Chrome, Edge, or Safari).

Type this into the address bar: http://localhost:5173

To play with friends: One person creates a room, gets the Room Code, and sends it to the other three.

4. Quick Rules Cheat Sheet
If you've never played this version of Hokm/Bound, keep these in mind:

Teams: You are teammates with the person sitting opposite you.

The Deck: We play with 36 cards (including a Black and Red Joker).

The Black Joker: You MUST play this within the first 3 rounds. If you are still holding it at the end of Round 3, the other team gets +15 points instantly!

The Red Joker: You cannot play this until someone has already played the Black Joker (unless you hold both). Also, don't save it for the very last round—that's another 15-point penalty.

Winning: First team to 54 points wins the match.

🛠 Troubleshooting
"Command not found": Restart your computer after installing Node.js.

Game is stuck: Refresh your browser tab.

Can't find friends: Make sure everyone is on the same Wi-Fi if playing locally, or that the website is properly deployed to a link like Render or Railway.