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
- Later saving favorite teams or preferences

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
Extension reads API key from storage
      ↓
Extension calls football API
      ↓
API returns live match data
      ↓
UI displays score, minute, and scorers
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
