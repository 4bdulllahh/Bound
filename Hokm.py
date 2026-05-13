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
        
    def get_sort_value(self):
        suit_order = {"Hearts": 0, "Spades": 1, "Clubs": 2, "Diamonds": 3, None: 4}
        return (suit_order[self.suit], self.rank)

    def get_display_rank(self):
        if self.is_joker: return self.joker_type[0]
        mapping = {11: "J", 12: "Q", 13: "K", 14: "A"}
        return mapping.get(self.rank, str(self.rank))

class HokmGame:
    def __init__(self):
        self.deck = self.create_deck()
        self.players = [[], [], [], []]
        self.game_phase = "SHUFFLE"
        self.status_msg = "Press SPACE to Shuffle."
        self.bid_buttons = []
        self.hokm_buttons = []
        self.current_bid = 5
        self.bid_winner = None
        self.hokm_suit = None
        self.turn_index = 0

    def create_deck(self):
        deck = []
        for suit in ["Hearts", "Spades", "Clubs", "Diamonds"]:
            for rank in range(6, 15):
                if rank == 6 and suit not in ["Hearts", "Spades"]: continue
                deck.append(Card(suit, rank))
        deck.append(Card(None, 15, True, "Black"))
        deck.append(Card(None, 16, True, "Red"))
        return deck

    def sort_hand(self, p_idx):
        self.players[p_idx].sort(key=lambda x: x.get_sort_value())

    def deal_cards(self):
        for _ in range(3):
            for i in range(4):
                for _ in range(3):
                    self.players[i].append(self.deck.pop())
        for i in range(4): self.sort_hand(i)
        self.game_phase = "BID"
        self.create_bid_ui()

    def create_bid_ui(self):
        self.bid_buttons = []
        for i, opt in enumerate(["6", "7", "8", "9", "Skip"]):
            rect = pygame.Rect(300 + (i * 80), 300, 70, 45)
            self.bid_buttons.append((rect, opt))

    def bot_bidding(self):
        # Medium AI logic: Bots will outbid if they have a Joker or 3+ Aces/Kings
        for i in range(1, 4):
            power_cards = [c for c in self.players[i] if c.rank >= 13 or c.is_joker]
            potential_bid = self.current_bid + 1
            if len(power_cards) > 3 and potential_bid <= 8:
                self.current_bid = potential_bid
                self.bid_winner = i
            # If all skip, P0 (you) or the last bidder wins
        if self.bid_winner is None: self.bid_winner = 0
        
        if self.bid_winner == 0:
            self.game_phase = "CHOOSE_HOKM"
            self.create_hokm_ui()
            self.status_msg = f"You won the bid with {self.current_bid}! Choose Hokm:"
        else:
            self.hokm_suit = random.choice(["Hearts", "Spades", "Clubs", "Diamonds"])
            self.game_phase = "PLAY"
            self.status_msg = f"Bot {self.bid_winner} bid {self.current_bid}. Hokm is {self.hokm_suit}."

    def create_hokm_ui(self):
        self.hokm_buttons = []
        for i, suit in enumerate(["Hearts", "Spades", "Clubs", "Diamonds"]):
            rect = pygame.Rect(300 + (i * 100), 400, 90, 45)
            self.hokm_buttons.append((rect, suit))

def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    font = pygame.font.SysFont("Arial", 22, bold=True)
    game = HokmGame()
    clock = pygame.time.Clock()

    while True:
        screen.fill(GREEN)
        m_pos = pygame.mouse.get_pos()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if game.game_phase == "SHUFFLE": 
                    game.game_phase = "CUT"
                    game.status_msg = "Click anywhere to CUT."

            if event.type == pygame.MOUSEBUTTONDOWN:
                if game.game_phase == "CUT":
                    random.shuffle(game.deck)
                    game.deal_cards()
                
                elif game.game_phase == "BID":
                    for rect, val in game.bid_buttons:
                        if rect.collidepoint(m_pos):
                            if val != "Skip":
                                game.current_bid = int(val)
                                game.bid_winner = 0
                            game.bot_bidding()
                
                elif game.game_phase == "CHOOSE_HOKM":
                    for rect, suit in game.hokm_buttons:
                        if rect.collidepoint(m_pos):
                            game.hokm_suit = suit
                            game.game_phase = "PLAY"
                            game.status_msg = f"Hokm is {suit}. Game Starts!"

        # Draw Status
        screen.blit(font.render(game.status_msg, True, WHITE), (30, 30))

        # UI Drawing
        if game.game_phase == "BID":
            for rect, val in game.bid_buttons:
                pygame.draw.rect(screen, GOLD if rect.collidepoint(m_pos) else WHITE, rect)
                pygame.draw.rect(screen, BLACK, rect, 2)
                screen.blit(font.render(val, True, BLACK), (rect.x+15, rect.y+10))
        
        if game.game_phase == "CHOOSE_HOKM":
            for rect, suit in game.hokm_buttons:
                pygame.draw.rect(screen, WHITE, rect)
                pygame.draw.rect(screen, SUIT_COLORS[suit], rect, 3)
                screen.blit(font.render(SUIT_LETTERS[suit], True, SUIT_COLORS[suit]), (rect.x+35, rect.y+10))

        # Draw Player 0 Hand
        for i, card in enumerate(game.players[0]):
            x, y = 100 + (i * 80), 550
            pygame.draw.rect(screen, WHITE, (x, y, CARD_WIDTH, CARD_HEIGHT), border_radius=5)
            pygame.draw.rect(screen, BLACK, (x, y, CARD_WIDTH, CARD_HEIGHT), 2, border_radius=5)
            
            if not card.is_joker:
                # Suit color bar + Letter
                pygame.draw.rect(screen, SUIT_COLORS[card.suit], (x+5, y+5, CARD_WIDTH-10, 15))
                screen.blit(font.render(SUIT_LETTERS[card.suit], True, WHITE), (x+25, y+3))
            else:
                pygame.draw.rect(screen, GRAY, (x+5, y+5, CARD_WIDTH-10, 15))
            
            # Rank Display (J, Q, K, A)
            rank_txt = font.render(card.get_display_rank(), True, BLACK)
            screen.blit(rank_txt, (x+CARD_WIDTH//2-10, y+45))

        pygame.display.flip()
        clock.tick(FPS)

if __name__ == "__main__": main()