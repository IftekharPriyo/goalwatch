# ARCHITECTURE.md

## Project Architecture

Football Live Scores Extension is a Chrome extension that shows live football match information directly from the browser toolbar.

## MVP Architecture

```txt
Chrome Extension
      ↓
User API Key
      ↓
Football API
      ↓
Popup UI
```

## Main Parts

### 1. Popup UI

The popup is the main interface users see when clicking the extension icon.

It displays:

- Live matches
- Current score
- Match minute/status
- Goal scorers

### 2. Options Page

The options page allows users to save their own football API key.

The API key is stored locally using Chrome storage.

### 3. API Service

The API service handles all football API requests.

Responsibilities:

- Read stored API key
- Fetch live match data
- Fetch match events
- Format response data for the UI

### 4. Chrome Storage

Chrome storage is used for:

- Saving the user's API key
- Caching World Cup fixtures and final scores
- Later saving favorite teams or preferences

### 5. Shared Schedule Feed

A scheduled GitHub Action uses a repository secret to fetch World Cup fixtures
from football-data.org. It publishes only sanitized fixture JSON to GitHub
Pages. The popup downloads this public feed, while API-FOOTBALL remains the
source for live scores and goal events.

## Suggested Folder Structure

```txt
src/
├── components/
│   ├── MatchCard.tsx
│   └── ScoreList.tsx
├── pages/
│   ├── Popup.tsx
│   └── Options.tsx
├── services/
│   └── footballApi.ts
├── types/
│   └── football.ts
├── utils/
│   └── formatMatch.ts
└── main.tsx
```

## Data Flow

```txt
User opens popup
      ↓
Extension reads cached World Cup fixtures
      ↓
Upcoming and Past render without an API request
      ↓
Live checks the cached kickoff window
      ↓
API is called only when a match could be active
```

## Future Architecture

Later, the extension can use a backend.

```txt
Chrome Extension
      ↓
Backend API
      ↓
Football API
      ↓
Database / Cache
```

This future version can support:

- Hidden API key
- Better caching
- Favorite teams
- Notifications
- User accounts
- Paid subscription features
