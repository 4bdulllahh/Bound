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
        self.deck = self.create_deck()
        self.players = [[], [], [], []]
        self.game_phase = "SHUFFLE"
        self.status_msg = "Press SPACE to Shuffle."
        self.bid_buttons = []
        self.hokm_buttons = []
        self.current_bid = 5
        self.bid_winner = None
        self.hokm_suit = None
        self.turn_index = 0 # 0: User, 1: Bot Left, 2: Partner, 3: Bot Right
        self.table_cards = [] # List of (player_index, Card)
        self.is_8_trick_special = False

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
                for _ in range(3): self.players[i].append(self.deck.pop())
        for i in range(4): self.sort_hand(i)
        self.game_phase = "BID"
        self.create_bid_ui()

    def create_bid_ui(self):
        self.bid_buttons = []
        for i, opt in enumerate(["6", "7", "8", "9", "Skip"]):
            rect = pygame.Rect(300 + (i * 80), 300, 70, 45)
            self.bid_buttons.append((rect, opt))

    def bot_bidding(self):
        for i in range(1, 4):
            power_cards = [c for c in self.players[i] if c.rank >= 13 or c.is_joker]
            if len(power_cards) > 3 and self.current_bid < 8:
                self.current_bid += 1
                self.bid_winner = i
        
        if self.bid_winner is None: self.bid_winner = 0
        self.is_8_trick_special = self.current_bid >= 8

        if self.bid_winner == 0:
            self.game_phase = "CHOOSE_HOKM"
            self.create_hokm_ui()
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
        # Person to the right of bidder starts
        self.turn_index = (self.bid_winner + 1) % 4
        self.status_msg = f"Hokm: {self.hokm_suit}. Player {self.turn_index}'s turn."

    def play_card(self, player_idx, card_idx):
        card = self.players[player_idx].pop(card_idx)
        self.table_cards.append((player_idx, card))
        self.turn_index = (self.turn_index + 1) % 4
        
        if len(self.table_cards) == 4:
            self.status_msg = "Trick Complete! (Logic for winner coming next...)"
            # For now, just clear the table after a delay or click
        else:
            self.status_msg = f"Turn: Player {self.turn_index}"

    def bot_play(self):
        if self.turn_index != 0 and self.game_phase == "PLAY":
            # Simple AI: Play the first valid card
            # In a real game, we would check for lead suit, but for now:
            self.play_card(self.turn_index, 0)

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
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE and game.game_phase == "SHUFFLE":
                game.game_phase = "CUT"
            if event.type == pygame.MOUSEBUTTONDOWN:
                if game.game_phase == "CUT":
                    random.shuffle(game.deck); game.deal_cards()
                elif game.game_phase == "BID":
                    for rect, val in game.bid_buttons:
                        if rect.collidepoint(m_pos):
                            if val != "Skip": 
                                game.current_bid = int(val); game.bid_winner = 0
                            game.bot_bidding()
                elif game.game_phase == "CHOOSE_HOKM":
                    for rect, suit in game.hokm_buttons:
                        if rect.collidepoint(m_pos):
                            game.hokm_suit = suit; game.start_play_phase()
                elif game.game_phase == "PLAY" and game.turn_index == 0:
                    for i, card in enumerate(game.players[0]):
                        if card.rect.collidepoint(m_pos):
                            game.play_card(0, i); break

        # AI Turn trigger
        if game.game_phase == "PLAY" and game.turn_index != 0:
            pygame.time.delay(500) # Wait a bit so it's not instant
            game.bot_play()

        # Draw Table
        pygame.draw.circle(screen, BLACK, (SCREEN_WIDTH//2, SCREEN_HEIGHT//2), 150, 2)
        for i, (p_idx, card) in enumerate(game.table_cards):
            # Positioning cards on table based on who played them
            pos_map = {0: (465, 400), 1: (350, 280), 2: (465, 180), 3: (580, 280)}
            x, y = pos_map[p_idx]
            pygame.draw.rect(screen, WHITE, (x, y, CARD_WIDTH, CARD_HEIGHT), border_radius=5)
            pygame.draw.rect(screen, BLACK, (x, y, CARD_WIDTH, CARD_HEIGHT), 2, border_radius=5)
            screen.blit(font.render(card.get_display_rank() + SUIT_LETTERS.get(card.suit, ""), True, BLACK), (x+10, y+35))

        # Draw Player Hand
        for i, card in enumerate(game.players[0]):
            x, y = 100 + (i * 80), 550
            card.rect = pygame.Rect(x, y, CARD_WIDTH, CARD_HEIGHT)
            pygame.draw.rect(screen, WHITE, card.rect, border_radius=5)
            pygame.draw.rect(screen, BLACK, card.rect, 2 if not card.rect.collidepoint(m_pos) else 4, border_radius=5)
            if not card.is_joker:
                pygame.draw.rect(screen, SUIT_COLORS[card.suit], (x+5, y+5, CARD_WIDTH-10, 15))
                screen.blit(font.render(SUIT_LETTERS[card.suit], True, WHITE), (x+25, y+3))
            screen.blit(font.render(card.get_display_rank(), True, BLACK), (x+20, y+45))

        screen.blit(font.render(game.status_msg, True, WHITE), (30, 30))
        if game.game_phase == "BID":
            for rect, val in game.bid_buttons:
                pygame.draw.rect(screen, WHITE, rect); screen.blit(font.render(val, True, BLACK), (rect.x+15, rect.y+10))
        if game.game_phase == "CHOOSE_HOKM":
            for rect, suit in game.hokm_buttons:
                pygame.draw.rect(screen, WHITE, rect); screen.blit(font.render(suit[0], True, RED if suit in ["Hearts", "Diamonds"] else BLACK), (rect.x+35, rect.y+10))

        pygame.display.flip(); clock.tick(FPS)

if __name__ == "__main__": main()