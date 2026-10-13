# Folder 6 – Software Testing Tools: Bug Fix and Retest

**Application:** Word Scramble game (Pygame), assigned repository `SETAPESU26/62_scramble`  
**AI tool used:** GitHub Copilot / LLM (VS Code)

## Evidence Files Included in this Folder
- **Before Video:** [Lab-4/Before.mp4](Lab-4/Before.mp4) (Demonstrates the original validation bug)
- **After Video:** [Lab-4/After.mp4](Lab-4/After.mp4) (Demonstrates the bug fixed and new features working)
- **Prompt Evidence:** [Lab-4/Chat_1.png](Lab-4/Chat_1.png), [Lab-4/Chat_2.png](Lab-4/Chat_2.png)
- **Chat Transcript:** [Lab-4/chat_history.json](Lab-4/chat_history.json)

## The Bug, the Cause, and the Fix
- **Bug:** Typing the correct unscrambled word was rejected, whereas entering the scrambled letters was accepted as correct.
- **Cause:** The player's submitted guess was compared against the scrambled display string instead of the secret target word.
- **Fix:** The validation condition was updated so that the guess string is verified directly against the secret word.

## Features Added with AI Assistance
- **Progressive Hint System:** Unveils letters of the target word with an associated score penalty.
- **Active Round Countdown Timer:** A countdown timer bar that reveals the secret word and transitions to the next round upon expiration.
- **Interactive Letter Tiles:** Rearrangeable visual tiles to let users interactively solve anagrams.
