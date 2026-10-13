import random
import pygame
from game.text_box import TextBox
 
class GameEngine:
    ROUND_DURATION_MS = 30_000
    TILE_SIZE = 56
    TILE_GAP = 8
    TILE_Y = 126

    def __init__(self, width, height):
        self.width = width
        self.height = height

        self.words = ["PYTHON", "PYGAME", "PLANET", "ROCKET", "GALAXY", "STREAM", "PUZZLE", "ALGORITHM"]
        self.secret_word = ""
        self.scrambled_word = ""
        self.tile_letters = []
        self.selected_tile = None
        self.hint_count = 0

        self.score = 0
        self.feedback_msg = "Unscramble the letters above!"
        self.feedback_color = (210, 215, 225)

        self.input_box = TextBox(width // 2 - 130, 210, 160, 46)
        self.submit_btn = pygame.Rect(width // 2 + 45, 210, 95, 46)
        self.hint_btn = pygame.Rect(width // 2 + 150, 210, 85, 46)
        self.timer_bar = pygame.Rect(width // 2 - 200, 390, 400, 18)

        self.font_title = pygame.font.SysFont(None, 40)
        self.font_word = pygame.font.SysFont(None, 52)
        self.font_msg = pygame.font.SysFont(None, 26)
        self.font_btn = pygame.font.SysFont(None, 24)

        self.next_round()

    def scramble_string(self, word):
        letters = list(word)
        while True:
            random.shuffle(letters)
            shuffled = "".join(letters)
            if shuffled != word or len(word) <= 1:
                return shuffled

    def next_round(self):
        self.secret_word = random.choice(self.words)
        self.scrambled_word = self.scramble_string(self.secret_word)
        self.tile_letters = list(self.scrambled_word)
        self.selected_tile = None
        self.hint_count = 0
        self.round_started_at = pygame.time.get_ticks()
        self.input_box.clear()

    def tile_rects(self):
        total_width = (
            len(self.tile_letters) * self.TILE_SIZE
            + max(0, len(self.tile_letters) - 1) * self.TILE_GAP
        )
        start_x = (self.width - total_width) // 2
        return [
            pygame.Rect(
                start_x + index * (self.TILE_SIZE + self.TILE_GAP),
                self.TILE_Y,
                self.TILE_SIZE,
                self.TILE_SIZE,
            )
            for index in range(len(self.tile_letters))
        ]

    def handle_tile_click(self, position):
        for index, rect in enumerate(self.tile_rects()):
            if rect.collidepoint(position):
                if self.selected_tile is None:
                    self.selected_tile = index
                elif self.selected_tile == index:
                    self.selected_tile = None
                else:
                    self.tile_letters[self.selected_tile], self.tile_letters[index] = (
                        self.tile_letters[index],
                        self.tile_letters[self.selected_tile],
                    )
                    self.selected_tile = None
                return

    def reveal_hint(self):
        if self.hint_count < len(self.secret_word):
            self.hint_count += 1
            self.score = max(0, self.score - 1)

    def submit_guess(self):
        typed_guess = self.input_box.text.strip().upper()
        guess = typed_guess if typed_guess else "".join(self.tile_letters)

        is_correct = (guess == self.secret_word)

        if is_correct:
            self.score += 1
            self.feedback_msg = f"CORRECT! '{self.secret_word}' is right."
            self.feedback_color = (80, 230, 110)
            self.next_round()
        else:
            self.feedback_msg = "WRONG GUESS! Try again."
            self.feedback_color = (240, 80, 80)
            self.input_box.clear()

    def handle_event(self, event):
        self.input_box.handle_event(event)

        if event.type == pygame.KEYDOWN and event.key == pygame.K_RETURN:
            self.submit_guess()
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.submit_btn.collidepoint(event.pos):
                self.submit_guess()
            elif self.hint_btn.collidepoint(event.pos):
                self.reveal_hint()
            else:
                self.handle_tile_click(event.pos)

    def update(self):
        if pygame.time.get_ticks() - self.round_started_at >= self.ROUND_DURATION_MS:
            self.feedback_msg = f"TIME'S UP! The word was '{self.secret_word}'."
            self.feedback_color = (240, 170, 50)
            self.next_round()

    def render(self, screen):
        screen.fill((26, 30, 38))

        title_surf = self.font_title.render("Word Scramble Arena", True, (245, 245, 245))
        screen.blit(title_surf, (self.width // 2 - title_surf.get_width() // 2, 25))

        score_surf = self.font_msg.render(f"Score: {self.score}", True, (255, 220, 80))
        screen.blit(score_surf, (self.width // 2 - score_surf.get_width() // 2, 70))

        for index, (letter, rect) in enumerate(zip(self.tile_letters, self.tile_rects())):
            tile_color = (75, 115, 170) if index != self.selected_tile else (200, 150, 45)
            pygame.draw.rect(screen, tile_color, rect, border_radius=8)
            pygame.draw.rect(screen, (220, 220, 220), rect, width=2, border_radius=8)
            letter_surf = self.font_word.render(letter, True, (255, 255, 255))
            screen.blit(
                letter_surf,
                (
                    rect.centerx - letter_surf.get_width() // 2,
                    rect.centery - letter_surf.get_height() // 2,
                ),
            )

        tile_help_surf = self.font_btn.render("Click two tiles to swap letters", True, (180, 185, 195))
        screen.blit(tile_help_surf, (self.width // 2 - tile_help_surf.get_width() // 2, 188))

        hint_text = " ".join(
            self.secret_word[index] if index < self.hint_count else "_"
            for index in range(len(self.secret_word))
        )
        hint_surf = self.font_msg.render(f"Hint: {hint_text}", True, (210, 215, 225))
        screen.blit(hint_surf, (self.width // 2 - hint_surf.get_width() // 2, 270))

        self.input_box.render(screen)

        pygame.draw.rect(screen, (50, 150, 85), self.submit_btn, border_radius=6)
        pygame.draw.rect(screen, (220, 220, 220), self.submit_btn, width=2, border_radius=6)
        btn_text = self.font_btn.render("SUBMIT", True, (255, 255, 255))
        screen.blit(btn_text, (self.submit_btn.centerx - btn_text.get_width() // 2, self.submit_btn.centery - btn_text.get_height() // 2))

        pygame.draw.rect(screen, (65, 105, 170), self.hint_btn, border_radius=6)
        pygame.draw.rect(screen, (220, 220, 220), self.hint_btn, width=2, border_radius=6)
        hint_btn_text = self.font_btn.render("HINT", True, (255, 255, 255))
        screen.blit(hint_btn_text, (self.hint_btn.centerx - hint_btn_text.get_width() // 2, self.hint_btn.centery - hint_btn_text.get_height() // 2))

        feedback_surf = self.font_msg.render(self.feedback_msg, True, self.feedback_color)
        screen.blit(feedback_surf, (self.width // 2 - feedback_surf.get_width() // 2, 330))

        elapsed = pygame.time.get_ticks() - self.round_started_at
        time_left = max(0, self.ROUND_DURATION_MS - elapsed)
        timer_ratio = time_left / self.ROUND_DURATION_MS
        timer_fill = self.timer_bar.copy()
        timer_fill.width = round(self.timer_bar.width * timer_ratio)
        pygame.draw.rect(screen, (75, 80, 90), self.timer_bar, border_radius=6)
        if timer_fill.width > 0:
            timer_color = (80, 210, 110) if timer_ratio > 0.5 else (240, 170, 50)
            if timer_ratio <= 0.2:
                timer_color = (240, 80, 80)
            pygame.draw.rect(screen, timer_color, timer_fill, border_radius=6)
        pygame.draw.rect(screen, (220, 220, 220), self.timer_bar, width=2, border_radius=6)
