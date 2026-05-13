import pygame
import random
import sys

# --- CONFIGURATION ---
SCREEN_WIDTH, SCREEN_HEIGHT = 1000, 700
CARD_WIDTH, CARD_HEIGHT = 70, 100
FPS = 60

# Colors
GREEN, WHITE, BLACK, RED = (34, 139, 34), (255, 255, 255), (0, 0, 0), (200, 0, 0)
BLUE, GRAY, GOLD = (0, 0, 255), (100, 100, 100), (255, 215, 0)
SUIT_COLORS = {"Hearts": RED, "Diamonds": RED, "Spades": BLACK, "Clubs": BLACK}

class Card:
    def __init__(self, suit, rank, is_joker=False, joker_type=None):
        self.suit = suit
        self.rank = rank
        self.is_joker = is_joker
        self.joker_type = joker_type # "Black" or "Red"
        
    def get_sort_value(self):
        # Sorting order: Hearts, Spades, Clubs, Diamonds, then Jokers
        suit_order = {"Hearts": 0, "Spades": 1, "Clubs": 2, "Diamonds": 3, None: 4}
        return (suit_order[self.suit], self.rank)

    def __repr__(self):
        return f"{self.rank} of {self.suit}" if not self.is_joker else f"{self.joker_type} Joker"

class HokmGame:
    def __init__(self):
        self.deck = self.create_deck()
        self.players = [[], [], [], []]
        self.game_phase = "SHUFFLE"
        self.status_msg = "Press SPACE to Shuffle."
        self.selected_bid = None
        self.bid_buttons = []

    def create_deck(self):
        deck = []
        for suit in ["Hearts", "Spades", "Clubs", "Diamonds"]:
            for rank in range(6, 15):
                if rank == 6 and suit not in ["Hearts", "Spades"]: continue
                deck.append(Card(suit, rank))
        deck.append(Card(None, 15, True, "Black"))
        deck.append(Card(None, 16, True, "Red"))
        return deck

    def sort_hand(self, player_idx):
        self.players[player_idx].sort(key=lambda x: x.get_sort_value())

    def deal_cards(self):
        for _ in range(3):
            for i in range(4):
                for _ in range(3):
                    self.players[i].append(self.deck.pop())
        self.sort_hand(0) # Auto-organize your hand
        self.game_phase = "BID"
        self.create_bid_ui()

    def create_bid_ui(self):
        self.bid_buttons = []
        options = ["5", "6", "7", "8", "9", "Skip"]
        for i, opt in enumerate(options):
            rect = pygame.Rect(300 + (i * 70), 300, 60, 40)
            self.bid_buttons.append((rect, opt))

def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    font = pygame.font.SysFont("Arial", 20)
    game = HokmGame()
    clock = pygame.time.Clock()

    while True:
        screen.fill(GREEN)
        mouse_pos = pygame.mouse.get_pos()
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            
            if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                if game.game_phase == "SHUFFLE": 
                    game.game_phase = "CUT"
                    game.status_msg = "Click anywhere to CUT."

            if event.type == pygame.MOUSEBUTTONDOWN:
                if game.game_phase == "CUT":
                    random.shuffle(game.deck)
                    game.deck = game.deck[10:] + game.deck[:10] # Simple cut
                    game.deal_cards()
                    game.status_msg = "Select your Bid:"
                
                elif game.game_phase == "BID":
                    for rect, val in game.bid_buttons:
                        if rect.collidepoint(mouse_pos):
                            game.selected_bid = val
                            game.status_msg = f"You bid: {val}. Waiting for others..."
                            # Phase transition logic would go here next

        # Draw Status
        screen.blit(font.render(game.status_msg, True, WHITE), (20, 20))

        # Draw Bid Buttons
        if game.game_phase == "BID":
            for rect, val in game.bid_buttons:
                color = GOLD if rect.collidepoint(mouse_pos) else WHITE
                pygame.draw.rect(screen, color, rect)
                pygame.draw.rect(screen, BLACK, rect, 2)
                txt = font.render(val, True, BLACK)
                screen.blit(txt, (rect.x + 10, rect.y + 10))

        # Draw Player 0 Hand (Sorted)
        for i, card in enumerate(game.players[0]):
            x, y = 100 + (i * 80), 550
            pygame.draw.rect(screen, WHITE, (x, y, CARD_WIDTH, CARD_HEIGHT))
            pygame.draw.rect(screen, BLACK, (x, y, CARD_WIDTH, CARD_HEIGHT), 2)
            
            # Suit Indicator Strip
            if not card.is_joker:
                pygame.draw.rect(screen, SUIT_COLORS[card.suit], (x+5, y+5, CARD_WIDTH-10, 10))
                suit_txt = font.render(card.suit[0], True, WHITE)
                screen.blit(suit_txt, (x+5, y+20))
            
            rank_val = card.joker_type if card.is_joker else card.rank
            rank_txt = font.render(str(rank_val), True, BLACK)
            screen.blit(rank_txt, (x+5, y+40))

        pygame.display.flip()
        clock.tick(FPS)

if __name__ == "__main__": main()