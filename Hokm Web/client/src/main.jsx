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
    return () => { socket.off('state'); socket.off('joined'); socket.off('errorMessage'); };
  }, []);

  if (!state) {
    return <Landing name={name} setName={setName} roomCode={roomCode} setRoomCode={setRoomCode} error={error} />;
  }
  return <Game state={state} error={error} />;
}

function Landing({ name, setName, roomCode, setRoomCode, error }) {
  const create = () => socket.emit('createRoom', { name: name.trim() || 'Player' });
  const join = () => socket.emit('joinRoom', { code: roomCode.trim().toUpperCase(), name: name.trim() || 'Player' });
  return (
    <main className="landing">
      <section className="hero cardPanel">
        <div className="brand"><Swords /> Bound</div>
        <h1>Play your custom team card game online.</h1>
        <p>4 players, opposite teammates, bidding, power suit, jokers, scoring to 54, and Bound.</p>
        <div className="formGrid">
          <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          <button onClick={create}>Create Room</button>
        </div>
        <div className="divider">or</div>
        <div className="formGrid">
          <input placeholder="Room code" value={roomCode} onChange={e => setRoomCode(e.target.value)} />
          <button onClick={join}>Join Room</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}

function Game({ state, error }) {
  const me = state.players[state.meSeat];
  const isHost = state.hostId === socket.id;
  const isMyTurn = state.turn === state.meSeat;
  const myBidTurn = state.biddingTurn === state.meSeat;
  const canCut = state.phase === 'cut' && state.cutter === state.meSeat;
  const canChooseTrump = state.phase === 'chooseTrump' && state.bidWinner === state.meSeat;
  const canCallBound = state.phase === 'playing' && state.bidWinner === state.meSeat && !state.bound && state.roundBid !== 'BOUND';

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
            {state.players.map(p => <Player key={p.seat} p={p} state={state} />)}
          </div>
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
          {canCallBound && <button className="danger" onClick={() => socket.emit('callBoundDuringPlay', { code: state.code })}>Call Bound Before Completing Bid</button>}
          {state.phase === 'roundover' && <ActionButton onClick={() => socket.emit('nextRound', { code: state.code })}><RotateCcw size={16}/> Start Next Round</ActionButton>}
          {state.phase === 'gameover' && <GameOver state={state} />}
        </section>

        <aside className="cardPanel">
          <h2>History</h2>
          <div className="history">
            {state.history.map((h, i) => <p key={i}>{h}</p>)}
          </div>
        </aside>
      </section>

      <section className="hand cardPanel">
        <h2>Your Hand {me ? <span className="muted">— {me.name}, Team {me.team + 1}</span> : null}</h2>
        <div className="cards">
          {state.hand.map(card => <Card key={card.id} card={card} disabled={!isMyTurn || state.phase !== 'playing'} onClick={() => socket.emit('playCard', { code: state.code, cardId: card.id })} />)}
        </div>
      </section>
    </main>
  );
}

function Scoreboard({ scores }) {
  return <div className="score"><div>Team 1 <b>{scores[0]}</b></div><div>Team 2 <b>{scores[1]}</b></div></div>;
}

function Player({ p, state }) {
  const badges = [];
  if (state.dealer === p.seat) badges.push('Shuffler');
  if (state.cutter === p.seat) badges.push('Cutter');
  if (state.biddingTurn === p.seat) badges.push('Bid turn');
  if (state.bidWinner === p.seat) badges.push('Bid winner');
  if (state.turn === p.seat) badges.push('Play turn');
  return (
    <div className={`player ${!p.connected ? 'offline' : ''}`}>
      <div><b>{p.name}</b><span> Seat {p.seat + 1}</span></div>
      <div className="muted">Team {p.team + 1} · {p.cardsCount} cards</div>
      <div className="badges">{badges.map(b => <em key={b}>{b}</em>)}</div>
    </div>
  );
}

function Info({ state }) {
  return <div className="info">
    <p><b>Bid:</b> {state.roundBid || state.currentBid || 'None'} {state.bidWinner !== null ? `by ${state.players[state.bidWinner]?.name}` : ''}</p>
    <p><b>Power suit:</b> {state.trump ? `${suitSymbols[state.trump]} ${suitNames[state.trump]}` : 'Not chosen'}</p>
    <p><b>Trick:</b> {state.trickNumber || 0}/9</p>
    <p><b>Tricks won:</b> Team 1: {state.tricksWon[0]} · Team 2: {state.tricksWon[1]}</p>
    <p><b>Black Joker used:</b> {state.blackJokerUsed ? 'Yes' : 'No'}</p>
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
  const [bid, setBid] = useState(5);
  const minBid = state.currentBid && state.currentBid !== 'BOUND' ? state.currentBid + 1 : 5;
  React.useEffect(() => setBid(minBid), [minBid]);
  return <div className="bidBox">
    <p>{enabled ? 'Your bidding turn.' : `Waiting for ${state.players[state.biddingTurn]?.name} to bid or skip.`}</p>
    <div className="bidControls">
      <select disabled={!enabled} value={bid} onChange={e => setBid(Number(e.target.value))}>
        {[5,6,7,8,9].filter(n => n >= minBid).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      <button disabled={!enabled} onClick={() => socket.emit('bid', { code: state.code, value: bid })}>Bid</button>
      <button disabled={!enabled} onClick={() => socket.emit('skipBid', { code: state.code })}>Skip</button>
      <button disabled={!enabled} className="danger" onClick={() => socket.emit('bid', { code: state.code, value: 'BOUND' })}>Bound</button>
    </div>
  </div>;
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

function GameOver({ state }) {
  return <div className="gameOver"><Trophy /><h2>Team {state.gameWinnerTeam + 1} wins!</h2><p>{state.message}</p></div>;
}

function ActionButton({ children, ...props }) { return <button className="action" {...props}>{children}</button>; }
function phaseTitle(state) {
  return ({ lobby: 'Lobby', cut: 'Cut the deck', bidding: 'Bidding Phase', chooseTrump: 'Choose Power Suit', playing: 'Round in Progress', roundover: 'Round Over', gameover: 'Game Over' })[state.phase] || state.phase;
}

createRoot(document.getElementById('root')).render(<App />);
