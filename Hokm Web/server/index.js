import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const rooms = new Map();
const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValue = Object.fromEntries(ranks.map((r, i) => [r, i + 6]));
const suitSymbols = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };

function code() {
  let c = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  do {
    c = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(c));
  return c;
}

function rightOf(i) { return (i + 1) % 4; }
function teammateOf(i) { return (i + 2) % 4; }
function teamOf(i) { return i % 2; }

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      if ((suit === 'clubs' || suit === 'diamonds') && rank === '6') continue;
      deck.push({ id: `${rank}-${suit}`, rank, suit, label: `${rank}${suitSymbols[suit]}`, type: 'normal' });
    }
  }
  deck.push({ id: 'black-joker', rank: 'BJ', suit: 'joker', label: 'Black Joker', type: 'blackJoker' });
  deck.push({ id: 'red-joker', rank: 'RJ', suit: 'joker', label: 'Red Joker', type: 'redJoker' });
  return deck;
}

function shuffle(deck) {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roomPublic(room, socketId = null) {
  const me = room.players.find(p => p.id === socketId);
  const players = room.players.map((p, idx) => ({
    id: p.id, name: p.name, seat: idx, connected: p.connected, cardsCount: p.hand.length, team: teamOf(idx)
  }));
  const hand = me ? me.hand : [];
  return {
    code: room.code,
    hostId: room.hostId,
    players,
    meSeat: me ? room.players.indexOf(me) : null,
    hand,
    phase: room.phase,
    message: room.message,
    scores: room.scores,
    dealer: room.dealer,
    cutter: room.cutter,
    bidStarter: room.bidStarter,
    currentBid: room.currentBid,
    currentBidder: room.currentBidder,
    biddingTurn: room.biddingTurn,
    skipped: room.skipped,
    bidWinner: room.bidWinner,
    trump: room.trump,
    leader: room.leader,
    turn: room.turn,
    trick: room.trick,
    trickNumber: room.trickNumber,
    tricksWon: room.tricksWon,
    blackJokerUsed: room.blackJokerUsed,
    bound: room.bound,
    gameWinnerTeam: room.gameWinnerTeam,
    gameLoserTeam: room.gameLoserTeam,
    roundBid: room.roundBid,
    history: room.history.slice(-12)
  };
}

function emitRoom(room) {
  for (const p of room.players) {
    if (p.id) io.to(p.id).emit('state', roomPublic(room, p.id));
  }
}

function addHistory(room, text) {
  room.history.push(text);
}

function makeRoom(hostId, name) {
  const room = {
    code: code(), hostId,
    players: [{ id: hostId, name, connected: true, hand: [] }],
    phase: 'lobby', message: 'Waiting for 4 players.', scores: [0, 0],
    dealer: null, cutter: null, bidStarter: null, currentBid: null, currentBidder: null,
    biddingTurn: null, skipped: [false, false, false, false], bidWinner: null, trump: null,
    leader: null, turn: null, trick: [], trickNumber: 0, tricksWon: [0, 0], blackJokerUsed: false,
    bound: false, roundBid: null, gameWinnerTeam: null, gameLoserTeam: null, history: [], roundNumber: 0
  };
  rooms.set(room.code, room);
  return room;
}

function resetForNewRound(room, dealer = null) {
  room.roundNumber += 1;
  room.players.forEach(p => p.hand = []);
  room.phase = 'cut';
  room.dealer = dealer ?? Math.floor(Math.random() * 4);
  room.cutter = rightOf(room.dealer);
  room.bidStarter = room.cutter;
  room.currentBid = null;
  room.currentBidder = null;
  room.biddingTurn = room.bidStarter;
  room.skipped = [false, false, false, false];
  room.bidWinner = null;
  room.trump = null;
  room.leader = null;
  room.turn = null;
  room.trick = [];
  room.trickNumber = 0;
  room.tricksWon = [0, 0];
  room.blackJokerUsed = false;
  room.bound = false;
  room.roundBid = null;
  room.gameWinnerTeam = null;
  room.gameLoserTeam = null;
  room.deck = shuffle(createDeck());
  room.message = `${room.players[room.dealer].name} shuffled. ${room.players[room.cutter].name} must cut the deck.`;
  addHistory(room, `Round ${room.roundNumber}: ${room.players[room.dealer].name} shuffles; ${room.players[room.cutter].name} cuts.`);
}

function deal(room) {
  const deck = room.deck;
  for (let i = 0; i < 36; i++) room.players[i % 4].hand.push(deck[i]);
  room.phase = 'bidding';
  room.message = `${room.players[room.bidStarter].name} starts bidding.`;
}

function nextActiveBidder(room, from) {
  for (let step = 1; step <= 4; step++) {
    const idx = (from + step) % 4;
    if (!room.skipped[idx]) return idx;
  }
  return null;
}

function activeBidders(room) {
  return [0,1,2,3].filter(i => !room.skipped[i]);
}

function finalizeBid(room, winner) {
  room.bidWinner = winner;
  room.roundBid = room.currentBid;
  room.phase = room.currentBid === 'BOUND' ? 'playing' : 'chooseTrump';
  if (room.currentBid === 'BOUND') {
    room.bound = true;
    room.roundBid = 'BOUND';
    room.trump = null;
    room.leader = rightOf(winner);
    room.turn = room.leader;
    room.trickNumber = 1;
    room.message = `${room.players[winner].name} called Bound. ${room.players[room.leader].name} starts the first trick.`;
    addHistory(room, `${room.players[winner].name} wins bidding with Bound.`);
  } else {
    room.message = `${room.players[winner].name} won the bid with ${room.currentBid}. Choose the power suit.`;
    addHistory(room, `${room.players[winner].name} wins bidding with ${room.currentBid}.`);
  }
}

function allSkippedNoBid(room) {
  return room.currentBid === null && room.skipped.every(Boolean);
}

function checkBiddingEnd(room) {
  if (allSkippedNoBid(room)) {
    addHistory(room, 'Everyone skipped. Cards are reshuffled.');
    resetForNewRound(room, room.dealer);
    return;
  }
  const active = activeBidders(room);
  if (room.currentBidder !== null && active.length === 1 && active[0] === room.currentBidder) {
    finalizeBid(room, room.currentBidder);
  }
}

function cardBeats(a, b, trump, leadSuit) {
  if (!b) return true;
  const power = c => c.type === 'redJoker' ? 500 : c.type === 'blackJoker' ? 400 : c.suit === trump ? 300 + rankValue[c.rank] : c.suit === leadSuit ? 100 + rankValue[c.rank] : rankValue[c.rank];
  return power(a.card) > power(b.card);
}

function validPlay(room, playerIdx, card) {
  if (room.phase !== 'playing') return { ok: false, msg: 'Not playing phase.' };
  if (room.turn !== playerIdx) return { ok: false, msg: 'Not your turn.' };
  const isLead = room.trick.length === 0;
  if ((card.type === 'blackJoker' || card.type === 'redJoker') && isLead) return { ok: false, msg: 'Jokers cannot start a trick.' };
  if (card.type === 'redJoker' && !room.blackJokerUsed) return { ok: false, msg: 'Red Joker can only be used after the Black Joker has been used.' };

  if (card.type === 'blackJoker' && room.trickNumber > 3) return { ok: true, illegalPenalty: true, msg: 'Black Joker used after the first 3 tricks.' };
  if (card.type === 'redJoker' && room.trickNumber === 9) return { ok: true, illegalPenalty: true, msg: 'Red Joker used in the last trick.' };

  if (!isLead && card.type === 'normal') {
    const leadSuit = room.trick[0].card.suit;
    const hasLeadSuit = room.players[playerIdx].hand.some(c => c.type === 'normal' && c.suit === leadSuit);
    if (hasLeadSuit && card.suit !== leadSuit) return { ok: false, msg: `You must play ${leadSuit} if you have it.` };
  }
  return { ok: true };
}

function finishTrick(room) {
  const leadSuit = room.trick[0].card.suit;
  let best = room.trick[0];
  for (const play of room.trick.slice(1)) if (cardBeats(play, best, room.trump, leadSuit)) best = play;
  const winner = best.player;
  room.tricksWon[teamOf(winner)] += 1;
  addHistory(room, `${room.players[winner].name} wins trick ${room.trickNumber}.`);
  room.trick = [];

  if (room.bound) {
    const bidderTeam = teamOf(room.bidWinner);
    if (teamOf(winner) !== bidderTeam) {
      room.phase = 'gameover';
      room.gameLoserTeam = bidderTeam;
      room.gameWinnerTeam = 1 - bidderTeam;
      room.message = `Bound failed. Team ${1 - bidderTeam + 1} wins the game.`;
      return;
    }
  }

  if (room.trickNumber >= 9) return scoreRound(room);
  room.trickNumber += 1;
  room.leader = winner;
  room.turn = winner;
  room.message = `${room.players[winner].name} starts trick ${room.trickNumber}.`;
}

function scoreRound(room) {
  const bidderTeam = teamOf(room.bidWinner);
  const otherTeam = 1 - bidderTeam;
  if (room.bound) {
    room.phase = 'gameover';
    room.gameWinnerTeam = bidderTeam;
    room.message = `Bound succeeded. Team ${bidderTeam + 1} wins the game.`;
    return;
  }

  const bid = Number(room.roundBid);
  const success = room.tricksWon[bidderTeam] >= bid;
  if (success) {
    room.scores[bidderTeam] += bid;
    room.message = `Bid succeeded. Team ${bidderTeam + 1} gets ${bid} points.`;
  } else if (room.roundNumber === 1) {
    room.scores[otherTeam] += bid;
    room.message = `First-round bid failed. Team ${otherTeam + 1} gets ${bid} points; bidding team gets 0.`;
  } else {
    room.scores[bidderTeam] -= bid;
    room.scores[otherTeam] += bid * 2;
    room.message = `Bid failed. Team ${bidderTeam + 1} gets -${bid}; Team ${otherTeam + 1} gets ${bid * 2}.`;
  }
  addHistory(room, room.message);
  if (room.scores[0] >= 54 || room.scores[1] >= 54) {
    room.phase = 'gameover';
    room.gameWinnerTeam = room.scores[0] >= 54 ? 0 : 1;
    room.message = `Team ${room.gameWinnerTeam + 1} reached 54 points and wins the game.`;
  } else {
    room.phase = 'roundover';
    room.nextDealer = rightOf(room.bidWinner);
  }
}

function illegalJokerPenalty(room, offendingPlayer, reason) {
  const offendingTeam = teamOf(offendingPlayer);
  const otherTeam = 1 - offendingTeam;
  room.scores[otherTeam] += 15;
  room.phase = room.scores[otherTeam] >= 54 ? 'gameover' : 'roundover';
  if (room.phase === 'gameover') room.gameWinnerTeam = otherTeam;
  room.nextDealer = rightOf(offendingPlayer);
  room.message = `${reason} Round ends immediately. Team ${otherTeam + 1} gets 15 points. Team ${offendingTeam + 1} gets 0 for the round.`;
  addHistory(room, room.message);
}

io.on('connection', socket => {
  socket.on('createRoom', ({ name }) => {
    const room = makeRoom(socket.id, name || 'Host');
    socket.join(room.code);
    socket.emit('joined', { code: room.code });
    emitRoom(room);
  });

  socket.on('joinRoom', ({ code: roomCode, name }) => {
    const room = rooms.get((roomCode || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found.');
    if (room.players.length >= 4) return socket.emit('errorMessage', 'Room is full.');
    room.players.push({ id: socket.id, name: name || `Player ${room.players.length + 1}`, connected: true, hand: [] });
    socket.join(room.code);
    if (room.players.length === 4) room.message = 'Four players joined. Host can start the round.';
    emitRoom(room);
  });

  socket.on('startRound', ({ code: roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || socket.id !== room.hostId) return;
    if (room.players.length !== 4) return socket.emit('errorMessage', 'Need exactly 4 players.');
    resetForNewRound(room);
    emitRoom(room);
  });

  socket.on('cutDeck', ({ code: roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (room.phase !== 'cut' || idx !== room.cutter) return;
    const cutAt = Math.floor(Math.random() * 35) + 1;
    room.deck = [...room.deck.slice(cutAt), ...room.deck.slice(0, cutAt)];
    addHistory(room, `${room.players[idx].name} cut the deck.`);
    deal(room);
    emitRoom(room);
  });

  socket.on('bid', ({ code: roomCode, value }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (room.phase !== 'bidding' || idx !== room.biddingTurn) return;
    if (value === 'BOUND') {
      room.currentBid = 'BOUND'; room.currentBidder = idx; finalizeBid(room, idx); emitRoom(room); return;
    }
    const bid = Number(value);
    if (!Number.isInteger(bid) || bid < 5 || bid > 9) return socket.emit('errorMessage', 'Bid must be 5 to 9, or Bound.');
    if (room.currentBid !== null && room.currentBid !== 'BOUND' && bid <= room.currentBid) return socket.emit('errorMessage', 'Bid must be higher than current bid.');
    room.currentBid = bid;
    room.currentBidder = idx;
    room.skipped[idx] = false;
    addHistory(room, `${room.players[idx].name} bids ${bid}.`);
    room.biddingTurn = nextActiveBidder(room, idx);
    checkBiddingEnd(room);
    emitRoom(room);
  });

  socket.on('skipBid', ({ code: roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (room.phase !== 'bidding' || idx !== room.biddingTurn) return;
    room.skipped[idx] = true;
    addHistory(room, `${room.players[idx].name} skips.`);
    checkBiddingEnd(room);
    if (room.phase === 'bidding') room.biddingTurn = nextActiveBidder(room, idx);
    emitRoom(room);
  });

  socket.on('chooseTrump', ({ code: roomCode, suit }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (room.phase !== 'chooseTrump' || idx !== room.bidWinner || !suits.includes(suit)) return;
    room.trump = suit;
    room.phase = 'playing';
    room.leader = rightOf(room.bidWinner);
    room.turn = room.leader;
    room.trickNumber = 1;
    room.message = `${room.players[idx].name} chose ${suit} as power suit. ${room.players[room.leader].name} starts.`;
    addHistory(room, room.message);
    emitRoom(room);
  });

  socket.on('playCard', ({ code: roomCode, cardId }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    const hand = room.players[idx]?.hand || [];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    if (cardIndex < 0) return;
    const card = hand[cardIndex];
    const valid = validPlay(room, idx, card);
    if (!valid.ok) return socket.emit('errorMessage', valid.msg);
    hand.splice(cardIndex, 1);
    if (valid.illegalPenalty) { illegalJokerPenalty(room, idx, valid.msg); emitRoom(room); return; }
    if (card.type === 'blackJoker') room.blackJokerUsed = true;
    room.trick.push({ player: idx, card });
    addHistory(room, `${room.players[idx].name} plays ${card.label}.`);
    if (room.trick.length === 4) finishTrick(room);
    else room.turn = rightOf(idx);
    emitRoom(room);
  });

  socket.on('callBoundDuringPlay', ({ code: roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const idx = room.players.findIndex(p => p.id === socket.id);
    if (room.phase !== 'playing' || idx !== room.bidWinner || room.bound || room.roundBid === 'BOUND') return;
    const bidderTeam = teamOf(room.bidWinner);
    if (room.tricksWon[bidderTeam] >= Number(room.roundBid)) return socket.emit('errorMessage', 'You can only call Bound before completing your original bid.');
    const completed = room.trickNumber - 1;
    if (room.tricksWon[bidderTeam] !== completed) return socket.emit('errorMessage', 'Bound can only be called if your team has won every trick so far.');
    room.bound = true;
    room.message = `${room.players[idx].name} called Bound during play. They must win all 9 tricks or lose the game.`;
    addHistory(room, room.message);
    emitRoom(room);
  });

  socket.on('nextRound', ({ code: roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || room.phase !== 'roundover') return;
    const dealer = room.nextDealer ?? rightOf(room.bidWinner ?? 0);
    resetForNewRound(room, dealer);
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const p = room.players.find(p => p.id === socket.id);
      if (p) { p.connected = false; emitRoom(room); }
    }
  });
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
