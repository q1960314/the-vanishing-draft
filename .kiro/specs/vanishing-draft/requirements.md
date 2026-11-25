# Requirements — The Vanishing Draft

## Introduction
A haunted writing desk. Stop typing and unsaved words fade into ghosts; keep writing to win them back; bind a finished piece into a book. Client-side only, localStorage only.

## Glossary
- **Word**: a whitespace-separated token in the draft.
- **Ghost word**: a word whose opacity reached 0.25. It stays visible, grey-green, with a ghost mark.
- **Bound book**: a finished draft saved to the shelf, with title, timestamp, body, and lost-word count.

## Requirements

### Requirement 1: Idle detection
**User Story:** As a writer, I want the desk to notice when I stop typing, so the haunting starts only after a real pause.

#### Acceptance Criteria
1. WHEN no keystroke arrives for 5 seconds, THEN the fade starts.
2. WHEN a keystroke arrives, THEN the idle timer resets to 0 and the fade stops.

### Requirement 2: Word fade
**User Story:** As a writer, I want words to fade one by one, oldest first, so the cost of stopping is visible and fair.

#### Acceptance Criteria
1. WHEN the fade runs, THEN one word is processed every 1.2 seconds, oldest unsaved word first.
2. WHEN a word is processed, THEN its opacity moves one step: 1.0 → 0.6 → 0.25.
3. WHEN a word reaches 0.25, THEN it is a ghost word: grey-green, with a ghost mark, still visible.

### Requirement 3: Win back
**User Story:** As a writer, I want typing to win ghost words back, so writing is the way out.

#### Acceptance Criteria
1. WHEN a keystroke arrives while ghost words exist, THEN the most recent ghost word returns to opacity 1.0.
2. WHEN a keystroke arrives, THEN exactly one ghost word is restored per keystroke.

### Requirement 4: Save draft
**User Story:** As a writer, I want to save the draft, so my words stop fading.

#### Acceptance Criteria
1. WHEN the user clicks Save Draft, THEN all words return to opacity 1.0 and the fade stops.
2. WHEN the user clicks Save Draft, THEN the draft is written to localStorage under `vd.draft`.
3. WHEN the page reloads, THEN the saved draft is restored into the editor and the manuscript.

### Requirement 5: Bind into a book
**User Story:** As a writer, I want to bind a finished piece into a book, so it is safe from ghosts forever.

#### Acceptance Criteria
1. WHEN the user clicks Bind into Book, THEN every word at opacity 1.0 is collected into the book body.
2. WHEN the user clicks Bind into Book, THEN ghost words are excluded from the book and counted as lost words.
3. WHEN the user clicks Bind into Book, THEN the book is appended to localStorage under `vd.books` with title, timestamp, body, and lost-word count.
4. WHEN the user clicks Bind into Book, THEN the editor is cleared and a new page starts.

### Requirement 6: Bookshelf
**User Story:** As a writer, I want a shelf of bound books, so finished work stays visible.

#### Acceptance Criteria
1. WHEN the page loads, THEN the shelf lists every book in localStorage under `vd.books`.
2. WHEN the user clicks a book, THEN its full text opens.
3. WHEN the user deletes a book, THEN it is removed from the shelf and from localStorage.

### Requirement 7: Export
**User Story:** As a writer, I want to export my words, so they leave the desk.

#### Acceptance Criteria
1. WHEN the user exports the draft, THEN a `.txt` file downloads with exactly the editor text.
2. WHEN the user exports a book, THEN a `.md` file downloads with title, body, and lost-word count.
3. WHEN the user exports all books, THEN one `.md` file downloads containing every book.

### Requirement 8: Statistics
**User Story:** As a writer, I want to see what the ghosts took, so the cost is honest.

#### Acceptance Criteria
1. WHEN words are typed, lost, or bound, THEN the counters update: total words written, total words lost, books bound, longest continuous writing run in seconds.
2. WHEN the page reloads, THEN the counters are restored from localStorage under `vd.stats`.

### Requirement 9: Themes and legibility
**User Story:** As a writer, I want to read my words in any light, so the desk offers a dark desk theme and a light parchment theme.

#### Acceptance Criteria
1. WHEN the user switches theme, THEN the whole page changes theme and the choice persists.
2. WHEN either theme is active, THEN body text contrast is at least 4.5:1.

### Requirement 10: Zero errors offline
**User Story:** As a writer, I want the desk to work with no network, so nothing breaks when the connection drops.

#### Acceptance Criteria
1. WHEN the page loads with no network, THEN it renders and every feature works.
2. WHEN the page loads, THEN the browser console shows zero JavaScript errors.
3. WHEN the page runs, THEN it makes zero external network requests.
