import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import { Crown, Copy, Swords, Users, Trophy, RotateCcw } from 'lucide-react';
import './styles.css';

const socket = io(import.meta.env.PROD ? undefined : 'http://localhost:3001');
const suitSymbols = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
const suitNames = { spades: 'Spades', hearts: 'Hearts', clubs: 'Clubs', diamonds: 'Diamonds' };

function App() {
  const [state, setState] = useState(null);
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    socket.on('state', setState);
    socket.on('joined', ({ code }) => setRoomCode(code));
    socket.on('errorMessage', msg => { setError(msg); setTimeout(() => setError(''), 3000); });
    socket.on('kicked', msg => { setState(null); setError(msg); });
    return () => { socket.off('state'); socket.off('joined'); socket.off('errorMessage'); socket.off('kicked'); };
  }, []);

  if (!state) {
    return <Landing name={name} setName={setName} roomCode={roomCode} setRoomCode={setRoomCode} error={error} />;
  }
  return <Game state={state} error={error} />;
}

function Landing({ name, setName, roomCode, setRoomCode, error }) {
  const create = () => socket.emit('createRoom', { name: name.trim() || 'Player' });
  const join = () => socket.emit('joinRoom', { code: roomCode.trim().toUpperCase(), name: name.trim() || 'Player', mode: 'player' });
  const spectate = () => socket.emit('joinRoom', { code: roomCode.trim().toUpperCase(), name: name.trim() || 'Spectator', mode: 'spectator' });
  return (
    <main className="landing">
      <section className="hero cardPanel">
        <div className="brand"><Swords /> Bound</div>
        <h1>Play your custom team card game online.</h1>
        <p>4 players, opposite teammates, bidding, Trump Suit, jokers, scoring to 54, and Bound.</p>
        <div className="formGrid">
          <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          <button onClick={create}>Create Room</button>
        </div>
        <div className="divider">or</div>
        <div className="formGrid">
          <input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
          <button onClick={join}>Join as Player</button>
          <button className="secondary" onClick={spectate}>Join as Spectator</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

function Game({ state, error }) {
  const me = state.meSeat !== null ? state.players[state.meSeat] : null;
  const isSpectator = state.meRole === 'spectator';
  const isHost = state.meIsHost;
  const isMyTurn = !isSpectator && state.turn === state.meSeat;
  const myBidTurn = !isSpectator && state.biddingTurn === state.meSeat;
  const canCut = !isSpectator && state.phase === 'cut' && state.cutter === state.meSeat;
  const canChooseTrump = !isSpectator && state.phase === 'chooseTrump' && state.bidWinner === state.meSeat;
  const canCallBound = !isSpectator && state.phase === 'playing' && state.bidWinner === state.meSeat && !state.bound && state.roundBid !== 'BOUND' && state.trickNumber <= 7;
  const sortedHand = useMemo(() => sortHand(state.hand || []), [state.hand]);

  return (
    <main className="app">
      <header className="topbar cardPanel">
        <div>
          <div className="brand"><Swords /> Bound</div>
          <p className="muted">Room <b>{state.code}</b> <button className="mini" onClick={() => navigator.clipboard.writeText(state.code)}><Copy size={14}/> Copy</button></p>
        </div>
        <Scoreboard scores={state.scores} />
      </header>

      {error && <div className="toast">{error}</div>}

      <section className="grid">
        <aside className="cardPanel">
          <h2><Users size={18}/> Players</h2>
          <div className="players">
            {state.players.map(p => <Player key={p.seat} p={p} state={state} isHost={isHost} />)}
          </div>
          <SpectatorList state={state} isHost={isHost} />
          <hr />
          <Info state={state} />
        </aside>

        <section className="table cardPanel">
          <div className="status">
            <h2>{phaseTitle(state)}</h2>
            <p>{state.message}</p>
          </div>

          {state.phase === 'lobby' && <LobbyActions state={state} isHost={isHost} />}
          {state.phase === 'cut' && <ActionButton disabled={!canCut} onClick={() => socket.emit('cutDeck', { code: state.code })}>{canCut ? 'Cut Deck' : 'Waiting for cutter'}</ActionButton>}
          {state.phase === 'bidding' && <Bidding state={state} enabled={myBidTurn} />}
          {state.phase === 'chooseTrump' && <TrumpPicker state={state} enabled={canChooseTrump} />}
          {(state.phase === 'playing' || state.phase === 'roundover' || state.phase === 'gameover') && <Board state={state} />}
          {canCallBound && <button className="danger" onClick={() => socket.emit('callBoundDuringPlay', { code: state.code })}>Call Bound</button>}
          {state.phase === 'roundover' && <ActionButton onClick={() => socket.emit('nextRound', { code: state.code })}><RotateCcw size={16}/> Start Next Round</ActionButton>}
          {state.phase === 'gameover' && <GameOver state={state} isHost={isHost} />}
        </section>

        <aside className="cardPanel rulesBox">
          <h2>Memory Mode</h2>
          <p className="muted">Played-card history is hidden. Count cards from memory only.</p>
          <hr />
          <h2>Quick Rules</h2>
          <p>Minimum bid is <b>6</b>. Bid <b>5</b> only appears for the last player if the previous three players skipped.</p>
          <p>Choose the <b>Trump Suit</b> only after winning the auction.</p>
          <p>Jokers cannot start a trick. Red Joker can only be used after Black Joker, unless one player holds both.</p>
          <p>Bound replaces a 9-trick bid and still requires Trump Suit selection before play.</p>
          <Chat state={state} />
        </aside>
      </section>

      <section className="hand cardPanel">
        <h2>{isSpectator ? 'Spectator View' : 'Your Hand'} {me ? <span className="muted">— {me.name}, Team {me.team + 1}</span> : null}</h2>
        {isSpectator ? <p className="muted">Spectators cannot see any player hands.</p> : <div className="cards">
          {sortedHand.map(card => <Card key={card.id} card={card} disabled={!isMyTurn || state.phase !== 'playing'} onClick={() => socket.emit('playCard', { code: state.code, cardId: card.id })} />)}
        </div>}
      </section>
    </main>
  );
}

function Scoreboard({ scores }) {
  return <div className="score"><div>Team 1 <b>{scores[0]}</b></div><div>Team 2 <b>{scores[1]}</b></div></div>;
}

function Player({ p, state, isHost }) {
  const badges = [];
  if (state.dealer === p.seat) badges.push('Shuffler');
  if (state.cutter === p.seat) badges.push('Cutter');
  if (state.biddingTurn === p.seat) badges.push('Bid turn');
  if (state.bidWinner === p.seat) badges.push('Bid winner');
  if (state.turn === p.seat) badges.push('Play turn');
  return (
    <div className={`player ${!p.connected ? 'offline' : ''}`}>
      <div><b>{p.name}</b><span> Seat {p.seat + 1}</span></div>
      <div className="muted">Team {p.team + 1}</div>
      <div className="badges">{badges.map(b => <em key={b}>{b}</em>)}</div>
      {isHost && p.id && !isSelf(p.id) && <div className="adminControls">
        <button className="mini dangerMini" onClick={() => socket.emit('kickUser', { code: state.code, targetId: p.id })}>Kick</button>
        <button className="mini" onClick={() => socket.emit('moveToSpectator', { code: state.code, targetId: p.id })}>Move to Spectators</button>
      </div>}
    </div>
  );
}

function isSelf(id) { return id === socket.id; }

function SpectatorList({ state, isHost }) {
  if (!state.spectators?.length) return null;
  return <div className="spectators">
    <h3>Spectators</h3>
    {state.spectators.map((s, i) => <div className={`spectator ${!s.connected ? 'offline' : ''}`} key={`${s.name}-${i}`}>
      <span>{s.name}</span>
      {isHost && s.id && <button className="mini dangerMini" onClick={() => socket.emit('kickUser', { code: state.code, targetId: s.id })}>Kick</button>}
    </div>)}
  </div>;
}


function Info({ state }) {
  return <div className="info">
    <p><b>Bid:</b> {state.roundBid || state.currentBid || 'None'} {state.bidWinner !== null ? `by ${state.players[state.bidWinner]?.name}` : ''}</p>
    <p><b>Trump Suit:</b> {state.trump ? `${suitSymbols[state.trump]} ${suitNames[state.trump]}` : 'Not chosen'}</p>
    <p><b>Trick:</b> {state.trickNumber || 0}/9</p>
    <p><b>Tricks won:</b> Team 1: {state.tricksWon[0]} · Team 2: {state.tricksWon[1]}</p>
    <p><b>Bound:</b> {state.bound ? 'Active' : 'No'}</p>
  </div>;
}

function LobbyActions({ state, isHost }) {
  return <div className="centerBox">
    <p>{state.players.length}/4 players joined.</p>
    <ActionButton disabled={!isHost || state.players.length !== 4} onClick={() => socket.emit('startRound', { code: state.code })}>Start Round</ActionButton>
  </div>;
}

function Bidding({ state, enabled }) {
  const minBid = getMinBid(state);
  const options = getBidOptions(minBid);
  const [bid, setBid] = useState(options[0]?.value ?? 6);
  React.useEffect(() => setBid(options[0]?.value ?? 6), [minBid, state.currentBid]);
  return <div className="bidBox">
    <p>{enabled ? `Your bidding turn. Minimum bid: ${minBid}.` : `Waiting for ${state.players[state.biddingTurn]?.name} to bid or skip.`}</p>
    <div className="bidControls">
      <select disabled={!enabled} value={String(bid)} onChange={e => setBid(e.target.value === 'BOUND' ? 'BOUND' : Number(e.target.value))}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <button disabled={!enabled} onClick={() => socket.emit('bid', { code: state.code, value: bid })}>Bid</button>
      <button disabled={!enabled} onClick={() => socket.emit('skipBid', { code: state.code })}>Skip</button>
    </div>
    {state.currentBid && <p className="muted">Current highest bid: {displayBid(state.currentBid)} by {state.players[state.currentBidder]?.name}</p>}
  </div>;
}

function getBidOptions(minBid) {
  const options = [];
  for (let n = minBid; n <= 8; n++) options.push({ value: n, label: String(n) });
  options.push({ value: 'BOUND', label: 'Bound' });
  return options;
}

function displayBid(value) { return value === 'BOUND' ? 'Bound' : value; }


function getMinBid(state) {
  if (state.currentBid && state.currentBid !== 'BOUND') return state.currentBid + 1;
  const skipped = state.skipped?.filter(Boolean).length || 0;
  if (!state.currentBid && skipped === 3) return 5;
  return 6;
}


function TrumpPicker({ state, enabled }) {
  return <div className="suitPicker">
    {Object.keys(suitSymbols).map(s => <button key={s} disabled={!enabled} onClick={() => socket.emit('chooseTrump', { code: state.code, suit: s })}>{suitSymbols[s]} {suitNames[s]}</button>)}
  </div>;
}

function Board({ state }) {
  return <div className="board">
    <h3>Current Trick</h3>
    <div className="playedCards">
      {state.trick.length === 0 && <p className="muted">No cards played yet.</p>}
      {state.trick.map(play => <div key={`${play.player}-${play.card.id}`} className="played"><span>{state.players[play.player]?.name}</span><Card card={play.card} small /></div>)}
    </div>
  </div>;
}

function Card({ card, disabled, onClick, small }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds' || card.type === 'redJoker';
  const joker = card.type !== 'normal';
  return <button className={`playingCard ${red ? 'red' : ''} ${joker ? 'joker' : ''} ${small ? 'small' : ''}`} disabled={disabled} onClick={onClick}>
    {joker ? <><span>{card.type === 'redJoker' ? '🃏' : '🃏'}</span><b>{card.type === 'redJoker' ? 'Red' : 'Black'}</b><small>Joker</small></> : <><b>{card.rank}</b><span>{suitSymbols[card.suit]}</span></>}
  </button>;
}

function GameOver({ state, isHost }) {
  return <div className="gameOver">
    <Trophy />
    <h2>Team {state.gameWinnerTeam + 1} wins!</h2>
    <p>{state.message}</p>
    <p className="muted">Final score: Team 1 {state.scores[0]} · Team 2 {state.scores[1]}</p>
    {isHost ? (
      <ActionButton onClick={() => socket.emit('playAgain', { code: state.code })}>
        <RotateCcw size={16}/> Play Again
      </ActionButton>
    ) : (
      <p className="muted">Waiting for the host to start a new match.</p>
    )}
  </div>;
}

function ActionButton({ children, ...props }) { return <button className="action" {...props}>{children}</button>; }
function phaseTitle(state) {
  return ({ lobby: 'Lobby', cut: 'Cut the deck', bidding: 'Bidding Phase', chooseTrump: 'Choose Trump Suit', playing: 'Round in Progress', roundover: 'Round Over', gameover: 'Game Over' })[state.phase] || state.phase;
}


function sortHand(hand) {
  const suitOrder = { hearts: 0, spades: 1, clubs: 2, diamonds: 3 };
  const rankOrder = { '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  const jokerOrder = { blackJoker: 100, redJoker: 101 };
  return [...hand].sort((a, b) => {
    const aJoker = a.type !== 'normal';
    const bJoker = b.type !== 'normal';
    if (aJoker || bJoker) {
      if (aJoker && bJoker) return jokerOrder[a.type] - jokerOrder[b.type];
      return aJoker ? 1 : -1;
    }
    if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
    return rankOrder[a.rank] - rankOrder[b.rank];
  });
}

function Chat({ state }) {
  const [text, setText] = useState('');
  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    socket.emit('sendChat', { code: state.code, text: clean });
    setText('');
  };
  return <div className="chatBox">
    <hr />
    <h2>Chat</h2>
    <div className="chatLog">
      {(state.chat || []).length === 0 && <p className="muted">No messages yet.</p>}
      {(state.chat || []).map((m, i) => <p key={`${m.at}-${i}`}><b>{m.senderName}</b> <span className="muted">({m.role})</span>: {m.text}</p>)}
    </div>
    <div className="chatInput">
      <input placeholder="Message" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} />
      <button className="mini" onClick={send}>Send</button>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
