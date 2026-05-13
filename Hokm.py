import pygame
import random
import sys

# --- CONFIGURATION & COLORS ---
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 700
CARD_WIDTH = 70
CARD_HEIGHT = 100
FPS = 60

WHITE = (255, 255, 255)
GREEN = (34, 139, 34)  # Table color
BLACK = (0, 0, 0)
RED = (200, 0, 0)
GOLD = (255, 215, 0)

# --- GAME CONSTANTS ---
SUITS = ["Hearts", "Spades", "Clubs", "Diamonds"]
RANKS = list(range(7, 15)) + [6] # 6-A, but we'll filter 6s later
# Note: 11=J, 12=Q, 13=K, 14=A, 15=BlackJoker, 16=RedJoker

class Card:
    def __init__(self, suit, rank, is_joker=False, joker_type=None):
        self.suit = suit
        self.rank = rank
        self.is_joker = is_joker
        self.joker_type = joker_type # "Black" or "Red"
        self.rect = pygame.Rect(0, 0, CARD_WIDTH, CARD_HEIGHT)

    def __repr__(self):
        if self.is_joker: return f"{self.joker_type} Joker"
        return f"{self.rank} of {self.suit}"

class HokmGame:
    def __init__(self):
        self.deck = self.create_deck()
        self.players = [[], [], [], []] # 0&2 are Team A, 1&3 are Team B
        self.scores = [0, 0] # [Team A, Team B]
        self.current_trick = []
        self.hokm_suit = None
        self.bid_amount = 6
        self.bidder_index = 0
        self.turn_index = 0
        self.round_count = 1
        self.black_joker_played = False
        self.first_round = True
        self.game_phase = "SHUFFLE" # SHUFFLE, CUT, BID, PLAY, PENALTY
        self.status_msg = "Welcome to Hokm! Press SPACE to Shuffle."

    def create_deck(self):
        deck = []
        for suit in SUITS:
            for rank in range(6, 15):
                # Only keep 6 of Hearts and Spades
                if rank == 6 and suit not in ["Hearts", "Spades"]:
                    continue
                deck.append(Card(suit, rank))
        # Add Jokers
        deck.append(Card(None, 15, True, "Black"))
        deck.append(Card(None, 16, True, "Red"))
        return deck

    def shuffle_and_cut(self, cut_index):
        random.shuffle(self.deck)
        # Apply the "Cut" logic: move half to bottom
        self.deck = self.deck[cut_index:] + self.deck[:cut_index]
        self.deal_cards()

    def deal_cards(self):
        # 3-3-3 Dealing logic
        for _ in range(3):
            for i in range(4):
                for _ in range(3):
                    self.players[i].append(self.deck.pop())
        self.game_phase = "BID"

    def check_joker_penalty(self, player_index, is_starting):
        # Rule 1: Black Joker must be played by Round 3
        has_black = any(c.joker_type == "Black" for c in self.players[player_index])
        if self.round_count > 3 and has_black:
            return True, "Black Joker Penalty! +15 for Opponents."
        
        # Rule 1.1: Cannot START Round 3 with Black Joker
        if self.round_count == 3 and is_starting and has_black:
            return True, "Cannot start Round 3 with Black Joker! +15 for Opponents."

        # Rule 3: Red Joker Ban in last round (Round 9)
        has_red = any(c.joker_type == "Red" for c in self.players[player_index])
        if self.round_count == 9 and has_red:
            return True, "Red Joker in Last Round! +15 for Opponents."
            
        return False, ""

# --- MAIN ENGINE ---
def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Hokm Online - Development Build")
    clock = pygame.time.Clock()
    game = HokmGame()

    while True:
        screen.fill(GREEN)
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and game.game_phase == "SHUFFLE":
                    game.game_phase = "CUT"
                    game.status_msg = "Click the deck to CUT the cards."

            if event.type == pygame.MOUSEBUTTONDOWN:
                if game.game_phase == "CUT":
                    game.shuffle_and_cut(random.randint(5, 30))
                    game.status_msg = "Cards Dealt. P1 choose Bid (5-9)."

        # --- DRAWING PLACEHOLDERS ---
        # Draw status message
        font = pygame.font.SysFont("Arial", 24)
        msg_surface = font.render(game.status_msg, True, WHITE)
        screen.blit(msg_surface, (20, 20))

        # Draw Player 0 Hand (Bottom)
        for i, card in enumerate(game.players[0]):
            x = 200 + (i * (CARD_WIDTH + 10))
            y = 550
            pygame.draw.rect(screen, WHITE, (x, y, CARD_WIDTH, CARD_HEIGHT))
            pygame.draw.rect(screen, BLACK, (x, y, CARD_WIDTH, CARD_HEIGHT), 2)
            label = font.render(f"{card.rank}", True, RED if card.suit in ["Hearts", "Diamonds"] else BLACK)
            screen.blit(label, (x+5, y+5))

        pygame.display.flip()
        clock.tick(FPS)

if __name__ == "__main__":
    main()