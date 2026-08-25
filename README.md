# NEXSTON CITY ROLEPLAY — Website

A 2050 AI/cyberpunk themed website for the **NEXSTON CITY ROLEPLAY** SA-MP server.

## What's inside
```
index.html          → public homepage (hero, live status terminal, countdown, features, join)
admin.html           → staff admin panel (login-gated)
assets/style.css     → shared design system
assets/main.js       → homepage logic (clock, countdown, status)
assets/admin.js      → admin panel logic (login, whitelist, status toggle)
data/config.json     → the single source of truth the site reads (status, IP, whitelist, countdown date)
```

## Deploying on GitHub Pages
1. Create a new GitHub repo (e.g. `nexston-city`).
2. Upload **all files, keeping the folder structure** (`assets/` and `data/` must stay as folders).
3. Go to **Settings → Pages → Deploy from branch**, pick `main` and `/root`, save.
4. Your site will be live at `https://<your-username>.github.io/nexston-city/`.

## Admin panel
- URL: `yoursite.com/admin.html`
- Access code: `SOMD456`
- Tabs: **Server Status** (online/offline toggle + player count), **Whitelist** (add/remove names), **Site Config** (server name, IP, countdown date).

## ⚠️ Important limitation: live server status
SA-MP servers talk over a **UDP query protocol**, which a plain, static site hosted on GitHub Pages **cannot reach directly** — browsers can't open raw UDP sockets, and GitHub Pages has no backend to do it for you. So real automatic "is the server up right now" detection isn't possible with files alone.

What this site does instead: the homepage reads its status from `data/config.json`. In the admin panel you flip the **ONLINE/OFFLINE** switch, hit **Save & Export**, and it downloads an updated `config.json` — you then re-upload that one file to the `data/` folder in your GitHub repo (overwrite the old one) and every visitor sees the new status. It's a one-file manual update, not fully automatic.

If you want *true* automatic live status later, you'd need a small backend (a cheap Node.js/PHP host or a serverless function) that actually queries the SA-MP server's UDP port and returns JSON — then `main.js` would fetch from that instead of the local `config.json`. Happy to help build that step if/when you get server hosting for it.

## Security note on the admin password
Because this is a static site with no server, the access code lives in `assets/admin.js` in plain text — anyone who views the page source can find it. It works fine for keeping casual visitors out of the panel, but don't use it to gate anything you can't afford to have leaked (e.g. don't put real player passwords, ban evidence, etc. in `config.json`).
