# TrafficGuard AI

Interactive Bengaluru traffic congestion prediction dashboard.

## Downloaded project setup

1. Install Node.js 20 or newer.
2. Open a terminal in this folder.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open the local URL shown in the terminal, usually `http://localhost:5173`.

## Build for submission

```bash
npm run build
```

The main app is in `src/App.tsx`. The graphical traffic pulse chart is included
and its data points update the selected prediction hour.

## Upload to GitHub

Create a new GitHub repository, then upload all files and folders from this
project. Do not upload `node_modules`; it is recreated by running `npm install`.