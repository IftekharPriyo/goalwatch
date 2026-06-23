# ⚽ Football Live Scores Extension

A lightweight Chrome extension that provides real-time football match information directly from the browser toolbar.

## Features

- Live match scores
- Current match minute and status
- Goal scorer information
- Quick access through the Chrome extension popup
- User-provided API key support
- Lightweight and fast experience

## Motivation

Football fans often need to open search engines or sports websites just to check a score.

This project aims to provide a simple and distraction-free way to view live football match information with a single click.

## MVP Scope

The first version focuses on:

- Displaying live match scores
- Showing match status and current minute
- Listing goal scorers
- Supporting major international tournaments and leagues

Advanced features such as favorite teams, notifications, and match subscriptions will be considered in future releases.

## Tech Stack

- TypeScript
- React
- Vite
- Chrome Extension (Manifest V3)

## Development

```bash
npm install
npm run dev
```

The Vite development server is useful for working on the UI in a browser. Chrome
extension APIs are available when the built extension is loaded in Chrome.

## Build

```bash
npm run build
```

The production-ready extension is generated in `dist/`.

## Load in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the generated `dist/` folder.

After rebuilding, select the extension's **Reload** button on the extensions
page to test the latest changes.

## Football API

GoalWatch uses [API-FOOTBALL by API-Sports](https://www.api-football.com/).

1. Create an API-Sports account and obtain an API-FOOTBALL key.
2. Open the GoalWatch extension settings.
3. Enter and save the key.
4. Open the popup to load matches that are currently live.

The extension requests `GET /fixtures?live=all` for live scores, then keeps only
fixtures whose league ID is `1` (API-FOOTBALL's FIFA World Cup league ID). For
World Cup fixtures with goals, it requests `GET /fixtures/events?fixture={id}`
to map goal scorers. API request quotas and competition availability depend on
the user's API-Sports plan.

## Roadmap

- [x] Chrome extension setup
- [x] Popup UI
- [x] Football API integration
- [x] API key configuration page
- [x] Live score display
- [x] Goal scorer display
- [ ] Match notifications
- [ ] Favorite teams support

## License

MIT
