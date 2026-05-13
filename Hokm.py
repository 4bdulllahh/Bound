import pygame
import random
import sys

# --- CONFIG ---
SCREEN_WIDTH, SCREEN_HEIGHT = 1000, 700
CARD_WIDTH, CARD_HEIGHT = 70, 100
FPS = 60

# Colors
GREEN, WHITE, BLACK, RED = (34, 139, 34), (255, 255, 255), (0, 0, 0), (200, 0, 0)
GOLD, GRAY = (255, 215, 0), (150, 150, 150)
SUIT_COLORS = {"Hearts": RED, "Diamonds": RED, "Spades": BLACK, "Clubs": BLACK}
SUIT_LETTERS = {"Hearts": "H", "Spades": "S", "Clubs": "C", "Diamonds": "D"}

class Card:
    def __init__(self, suit, rank, is_joker=False, joker_type=None):
        self.suit = suit
        self.rank = rank
        self.is_joker = is_joker
        self.joker_type = joker_type
        self.rect = pygame.Rect(0, 0, CARD_WIDTH, CARD_HEIGHT)
        
    def get_sort_value(self):
        suit_order = {"Hearts": 0, "Spades": 1, "Clubs": 2, "Diamonds": 3, None: 4}
        return (suit_order[self.suit], self.rank)

    def get_display_rank(self):
        if self.is_joker: return self.joker_type[0]
        mapping = {11: "J", 12: "Q", 13: "K", 14: "A"}
        return mapping.get(self.rank, str(self.rank))

class HokmGame:
    def __init__(self):
        self.players = [[], [], [], []]
        self.game_phase = "SHUFFLE"
        self.status_msg = "Press SPACE to Shuffle."
        self.bid_buttons = []
        self.hokm_buttons = []
        self.current_bid = 5
        self.bid_winner = 0
        self.hokm_suit = None
        self.turn_index = 0 
        self.table_cards = [] 
        self.trick_count = 1
        self.team_tricks = [0, 0] 
        self.match_score = [0, 0]
        self.black_joker_played = False
        self.bidding_turn = 0
        self.skip_count = 0

    def create_deck(self):
        deck = []
        for suit in ["Hearts", "Spades", "Clubs", "Diamonds"]:
            for rank in range(6, 15):
                if rank == 6 and suit not in ["Hearts", "Spades"]: continue
                deck.append(Card(suit, rank))
        deck.append(Card(None, 15, True, "Black"))
        deck.append(Card(None, 16, True, "Red"))
        return deck

    def deal_cards(self):
        self.players = [[], [], [], []]
        deck = self.create_deck()
        random.shuffle(deck)
        for _ in range(3):
            for i in range(4):
                for _ in range(3): self.players[i].append(deck.pop())
        for i in range(4): self.players[i].sort(key=lambda x: x.get_sort_value())
        self.game_phase = "BID"
        self.bidding_turn = 0
        self.current_bid = 5
        self.skip_count = 0
        self.create_bid_ui()

    def create_bid_ui(self):
        self.bid_buttons = []
        for i, opt in enumerate(["6", "7", "8", "9", "Skip"]):
            rect = pygame.Rect(300 + (i * 80), 300, 70, 45)
            self.bid_buttons.append((rect, opt))

    def handle_bidding(self, bid_val):
        if bid_val == "Skip":
            self.skip_count += 1
            self.status_msg = f"Player {self.bidding_turn} Skips."
        else:
            self.current_bid = int(bid_val)
            self.bid_winner = self.bidding_turn
            self.skip_count = 0 # Reset skip count on new high bid
            self.status_msg = f"Player {self.bidding_turn} Bids {bid_val}."
        
        self.bidding_turn = (self.bidding_turn + 1) % 4

        if self.skip_count >= 3 and self.current_bid >= 5:
            pygame.time.delay(500)
            if self.bid_winner == 0:
                self.game_phase = "CHOOSE_HOKM"
                self.create_hokm_ui()
                self.status_msg = "You won the bid! Choose Hokm:"
            else:
                self.hokm_suit = random.choice(["Hearts", "Spades", "Clubs", "Diamonds"])
                self.start_play_phase()

    def create_hokm_ui(self):
        self.hokm_buttons = []
        for i, suit in enumerate(["Hearts", "Spades", "Clubs", "Diamonds"]):
            rect = pygame.Rect(300 + (i * 100), 400, 90, 45)
            self.hokm_buttons.append((rect, suit))

    def start_play_phase(self):
        self.game_phase = "PLAY"
        self.black_joker_played = False
        self.trick_count = 1
        self.team_tricks = [0, 0]
        self.turn_index = (self.bid_winner + 3) % 4 
        self.status_msg = f"Hokm is {self.hokm_suit}!"

    def determine_trick_winner(self):
        winner_idx = self.table_cards[0][0]
        best_card = self.table_cards[0][1]

        for i in range(1, 4):
            p_idx, card = self.table_cards[i]
            # Red Joker sequence rule
            if card.joker_type == "Red":
                best_card, winner_idx = card, p_idx
                break
            elif card.joker_type == "Black" and best_card.joker_type != "Red":
                best_card, winner_idx = card, p_idx
            elif not best_card.is_joker:
                if card.suit == self.hokm_suit and best_card.suit != self.hokm_suit:
                    best_card, winner_idx = card, p_idx
                elif card.suit == best_card.suit and card.rank > best_card.rank:
                    best_card, winner_idx = card, p_idx
        
        winning_team = 0 if winner_idx in [0, 2] else 1
        self.team_tricks[winning_team] += 1
        self.turn_index = winner_idx
        self.table_cards = []
        
        # Black Joker Round 3 Check
        if self.trick_count == 3 and not self.black_joker_played:
            for p_idx in range(4):
                if any(c.joker_type == "Black" for c in self.players[p_idx]):
                    self.penalty_end(p_idx)
                    return

        self.trick_count += 1
        if self.trick_count > 9:
            self.game_phase = "SHUFFLE"
            self.status_msg = "Round Finished. SPACE to Restart."

    def play_card(self, player_idx, card_idx):
        card = self.players[player_idx][card_idx]
        
        # Red Joker sequence check (Must have Black played or have both)
        if card.joker_type == "Red" and not self.black_joker_played:
            has_black = any(c.joker_type == "Black" for c in self.players[player_idx])
            if not has_black:
                if player_idx == 0: self.status_msg = "Can't play Red Joker yet!"
                return

        card = self.players[player_idx].pop(card_idx)
        if card.joker_type == "Black": self.black_joker_played = True
        self.table_cards.append((player_idx, card))
        self.turn_index = (self.turn_index + 3) % 4 

    def penalty_end(self, culprit_idx):
        victim = 1 if culprit_idx in [0, 2] else 0
        self.match_score[victim] += 15
        self.game_phase = "SHUFFLE"
        self.status_msg = "JOKER PENALTY! +15. Press SPACE."

def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    font = pygame.font.SysFont("Arial", 20, bold=True)
    game = HokmGame()
    clock = pygame.time.Clock()

    while True:
        screen.fill(GREEN)
        m_pos = pygame.mouse.get_pos()
        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE and game.game_phase == "SHUFFLE":
                game.deal_cards()
            if event.type == pygame.MOUSEBUTTONDOWN:
                if game.game_phase == "BID" and game.bidding_turn == 0:
                    for rect, val in game.bid_buttons:
                        if rect.collidepoint(m_pos): game.handle_bidding(val)
                elif game.game_phase == "CHOOSE_HOKM":
                    for rect, suit in game.hokm_buttons:
                        if rect.collidepoint(m_pos): game.hokm_suit = suit; game.start_play_phase()
                elif game.game_phase == "PLAY" and game.turn_index == 0:
                    for i, card in enumerate(game.players[0]):
                        if card.rect.collidepoint(m_pos): game.play_card(0, i); break

        # AI Bidding Logic (Slower)
        if game.game_phase == "BID" and game.bidding_turn != 0:
            pygame.time.delay(800)
            power = len([c for c in game.players[game.bidding_turn] if c.rank >= 13 or c.is_joker])
            if power > 3 and game.current_bid < 8:
                game.handle_bidding(str(game.current_bid + 1))
            else:
                game.handle_bidding("Skip")

        # Play Logic
        if game.game_phase == "PLAY":
            if len(game.table_cards) == 4:
                pygame.time.delay(1200)
                game.determine_trick_winner()
            elif game.turn_index != 0:
                pygame.time.delay(600)
                game.play_card(game.turn_index, 0)

        # Draw Info Box (Top Left)
        if game.game_phase in ["PLAY", "SHUFFLE"]:
            info_box = [f"Winner: Team {'A' if game.bid_winner in [0,2] else 'B'}",
                        f"Target: {game.current_bid} tricks",
                        f"Hokm: {game.hokm_suit}"]
            for i, text in enumerate(info_box):
                screen.blit(font.render(text, True, WHITE), (20, 80 + (i*25)))

        # Scoreboard
        score_txt = [f"Match: A:{game.match_score[0]} B:{game.match_score[1]}",
                     f"Tricks: A:{game.team_tricks[0]} B:{game.team_tricks[1]}",
                     f"Trick: {game.trick_count}/9"]
        for i, line in enumerate(score_txt):
            screen.blit(font.render(line, True, GOLD), (750, 20 + (i*25)))

        # Cards and UI
        pos_map = {0: (465, 400), 3: (580, 280), 2: (465, 180), 1: (350, 280)}
        for p_idx, card in game.table_cards:
            x, y = pos_map[p_idx]
            pygame.draw.rect(screen, WHITE, (x, y, CARD_WIDTH, CARD_HEIGHT), border_radius=5)
            screen.blit(font.render(card.get_display_rank() + SUIT_LETTERS.get(card.suit, ""), True, BLACK), (x+15, y+35))

        for i, card in enumerate(game.players[0]):
            x, y = 100 + (i * 80), 550
            card.rect = pygame.Rect(x, y, CARD_WIDTH, CARD_HEIGHT)
            pygame.draw.rect(screen, WHITE, card.rect, border_radius=5)
            if not card.is_joker:
                pygame.draw.rect(screen, SUIT_COLORS[card.suit], (x+5, y+5, CARD_WIDTH-10, 15))
                screen.blit(font.render(SUIT_LETTERS[card.suit], True, WHITE), (x+25, y+3))
            screen.blit(font.render(card.get_display_rank(), True, BLACK), (x+25, y+45))

        screen.blit(font.render(game.status_msg, True, WHITE), (30, 30))
        if game.game_phase == "BID":
            for rect, val in game.bid_buttons:
                pygame.draw.rect(screen, WHITE, rect); screen.blit(font.render(val, True, BLACK), (rect.x+15, rect.y+10))
        if game.game_phase == "CHOOSE_HOKM":
            for rect, suit in game.hokm_buttons:
                pygame.draw.rect(screen, WHITE, rect); screen.blit(font.render(suit[0], True, RED if suit in ["Hearts", "Diamonds"] else BLACK), (rect.x+35, rect.y+10))

        pygame.display.flip(); clock.tick(FPS)

if __name__ == "__main__": main()