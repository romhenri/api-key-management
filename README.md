# API Key Management

A local-first web app for managing, validating, and organizing Gemini API keys. It helps you keep track of multiple keys, classify them by tier, detect duplicates, test prompts, and review quota expectations without needing a backend.

## Features

- Add, edit, archive, and delete API keys
- Validate keys against Gemini endpoints
- Track status for each key: valid, invalid, untested, or archived
- Label keys with tags and billing tiers
- Detect duplicate keys automatically
- Test prompts directly from the app and inspect latency/token behavior
- Store everything locally in the browser for quick, private use

## Tech Stack

- React
- TypeScript
- Vite
- Canvas Confetti for celebratory feedback

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the local URL shown by Vite in your browser.

## Build

To build the project for production:

```bash
npm run build
```

## Notes

This app uses browser local storage to persist your keys, so data stays on your device and no server setup is required.
