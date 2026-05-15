Bound Card Game — Simple Testing Guide
1. What is Bound?

Bound is a 4-player online team card game.

There are 2 teams:

Player 1 and Player 3 are teammates.
Player 2 and Player 4 are teammates.

Players sitting opposite each other are on the same team.

The aim is to reach 54 points first, or win instantly by successfully calling Bound.

2. How to Start the Game
Open the game link.
One player creates a room.
Share the room code with the other 3 players.
All 4 players join the same room.
When all 4 players are inside, the game can start.

Each player receives 9 cards.

3. The Deck

The game uses 36 cards.

Cards included:

Hearts: 6, 7, 8, 9, 10, J, Q, K, A
Spades: 6, 7, 8, 9, 10, J, Q, K, A
Clubs: 7, 8, 9, 10, J, Q, K, A
Diamonds: 7, 8, 9, 10, J, Q, K, A
1 Black Joker
1 Red Joker

The 6 of Clubs and 6 of Diamonds are not used.

4. Bidding

Bidding decides how many tricks a team promises to win.

The minimum normal bid is 6.

During bidding, players can either:

Bid higher than the current bid
Skip

The suit is not chosen during bidding.

The player who wins the bidding chooses the Hokm / Trump suit after bidding ends.

Example:

A player wins the bid with 6, then chooses Spades.

This means:

Their team must win at least 6 tricks.
Spades are the Hokm / Trump suit.
5. Important Bidding Rule About 5

Players cannot start bidding with 5.

A bid of 5 is only allowed if the first 3 players all skip.

Example:

Player 1: Skip
Player 2: Skip
Player 3: Skip
Player 4: Can choose 5, 6, or skip

If all 4 players skip, the cards are reshuffled and dealt again.

6. Starting the First Trick

After the bidding winner chooses the Hokm suit, the player to the right of the bidding winner starts the first trick.

Turns move anti-clockwise.

7. How to Play a Trick

The first card played in a trick decides the lead suit.

Other players must follow that suit if they have it.

Example:

If the first card is a Diamond, everyone must play a Diamond if they have one.

If a player does not have the lead suit, they may play:

A Hokm / Trump card
Any other card
A Joker, if allowed

The highest valid card wins the trick.

8. Card Power Order

From strongest to weakest:

Red Joker
Black Joker
Hokm / Trump cards
Cards from the lead suit
Other normal cards

Example:

If Spades are Hokm, then a 7 of Spades can beat an Ace of Hearts.

9. Joker Rules

There are two Jokers:

Black Joker
Red Joker

Jokers are special cards and do not belong to any suit.

Important:

Jokers cannot start a trick.
Jokers can only be used after someone else has already played the first card of the trick.
Jokers can be played even if the player has the lead suit.
10. Black Joker Rule

The Black Joker must be played within the first 3 tricks.

It can be played in:

Trick 1
Trick 2
Trick 3

If the Black Joker is still in someone’s hand after Trick 3, that team gets a penalty.

Penalty:

Opposing team gets 15 points.
The team with the illegal Joker gets 0 for that round.
The round ends immediately.
11. Red Joker Rule

The Red Joker is stronger than the Black Joker.

The Red Joker can only be played after the Black Joker has already been played.

Exception:

If one player has both Jokers, they are allowed to play the Red Joker.

The Red Joker cannot be used in the last trick.

If the Red Joker is held until the last trick, the team gets a penalty.

Penalty:

Opposing team gets 15 points.
The team with the illegal Joker gets 0 for that round.
The round ends immediately.
12. Special Rule for Bid 8 or Higher

If the winning bid is 8 or 9, the first player who starts the round must play a Hokm / Trump card if they have one.

If they do not have Hokm, they may play another card.

13. Scoring
If the bidding team succeeds

If the bidding team wins at least the number of tricks they bid, they score points equal to the number of tricks they actually won.

Example:

Bid: 6
Tricks won: 7
Score: 7 points

The other team gets 0.

If the bidding team fails in the first round

In the first round only:

Bidding team gets 0
Opposing team gets the bid amount

Example:

Bid: 6
Bidding team fails
Opposing team gets 6 points

If the bidding team fails after the first round

From the second round onwards:

Bidding team loses points equal to their bid
Opposing team gets double the bid

Example:

Bid: 6
Bidding team fails

Bidding team gets -6
Opposing team gets +12

14. Winning the Match

There are two ways to win.

Normal win

The first team to reach 54 points wins.

Bound win

A team can call Bound, meaning they promise to win all 9 tricks.

If they win all 9 tricks, they win the whole match immediately.

If they lose even one trick, they lose the whole match immediately.

15. When Bound Can Be Called

Bound can be called:

During bidding
During the round before or during Trick 7

Bound means the team must win all 9 tricks.

16. What Testers Should Check

Please test the game and check:

Can 4 players join the same room?
Are teammates seated opposite each other?
Does each player get 9 cards?
Is 5 only available after 3 players skip?
Does the game reshuffle if everyone skips?
Does the bidding winner choose Hokm?
Does the player to the right of the bidding winner start?
Are players forced to follow suit correctly?
Do Hokm cards beat normal cards?
Do Jokers work correctly?
Does the Black Joker penalty happen after Trick 3?
Does the Red Joker penalty happen in the last trick?
Does scoring work correctly?
Does the game end at 54 points?
Does Bound win or lose the game immediately?
17. How to Report Bugs

When reporting a bug, please write:

Room code
Which player you were
What happened
What should have happened
Screenshot, if possible