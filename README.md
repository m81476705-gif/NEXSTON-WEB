# NEXSTON CITY ROLEPLAY — Website

GitHub Pages එකේ දාන්න simple, static SA:MP roleplay website එකක්. Live server status
(ONLINE/OFFLINE + players online) automatic-ව update වෙනවා.

## 📁 මොනවද තියෙන්නේ
```
index.html   → page structure
style.css    → design (dark city theme)
script.js    → live status logic
```

## 🚀 GitHub Pages එකට දාන්නේ කොහොමද

1. GitHub එකේ අලුත් repo එකක් හදන්න (උදා: `nexston-city-rp`)
2. මේ files 3 (`index.html`, `style.css`, `script.js`) repo එකේ root එකට upload කරන්න
3. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)` → **Save**
4. විනාඩි කීපයකින් `https://<ඔයාගෙ-username>.github.io/nexston-city-rp/` වලින් site එක ලයිව් වෙනවා

## ⚠️ VERY IMPORTANT — Live status වැඩ කරන්න මේක කරන්න ඕන

Website එක player count ගන්නේ **api.open.mp/servers** කියන public list එකෙන් (SA:MP/open.mp
servers list කරන official service එක). ඒ list එකේ ඔයාගෙ server එක නැත්නම්, website එකේ
හැමවෙලේම **OFFLINE** විදිහට පෙන්නාවි — server එක ඇත්තටම online වුනත්.

Server එක list එකේ පේන්න, ඔයාගෙ `server.cfg` file එකේ මේවා check කරන්න:

```
announce 1
```
(comment වෙලා (`#` හෝ `//` දාලා) නැති බව confirm කරගන්න)

Save කරලා server එක restart කරලා විනාඩි 10-15ක් ඉන්න, එතකොට check කරන්න:
```
https://api.open.mp/servers
```
ඒකේ `"ip":"51.79.254.10:7774"` කියලා ඔයාගෙ server එක තියෙනවද බලන්න (Ctrl+F එකෙන් search කරන්න).
තිබ්බනම් website එකේ status එක automatic-ව update වෙනවා.

## 🧑‍🤝‍🧑 Player නම් list එකක් (roster) ගැන — Limitation එකක්

මේ static website එකට **player count** (`42/100` වගේ) සහ ONLINE/OFFLINE status එක accurate-ව
පෙන්නන්න පුළුවන් — ඒත් server එක ඇතුලේ මේ මොහොතේ **play කරන කට්ටියගෙ නම් list එකක්**
(player names) පෙන්නන්න SA:MP protocol එකට UDP query එකක් යවන්න ඕන, ඒක browser එකකින්
කරන්න බැහැ (security restriction එකක්, static GitHub Pages site එකකින් කරන්න බැරි දෙයක්).

ඒක ඕන නම් පස්සේ step එකක් විදිහට කරන්න පුළුවන්:
- Free serverless function එකක් (Cloudflare Workers / Vercel Functions) හදලා, ඒකෙන් server එකට
  UDP query එකක් යවලා player list එක JSON විදිහට return කරන්න, website එක ඒක fetch කරන්න.
- මම ඒක හදන්න උදව් කරන්නම්, ඔයාට ඕන නම් කියන්න.

## ✏️ වෙනස් කරන්න ඕන දේවල්

- **Server IP/Port වෙනස් වුනොත්**: `script.js` එකේ `SERVER_IP` සහ `SERVER_PORT` වෙනස් කරන්න,
  සහ `index.html` එකේ `samp://...` links + `51.79.254.10:7774` හැම තැනකම වෙනස් කරන්න.
- **Discord link**: `index.html` එකේ `discord.gg/PGPsDgkps` හැම තැනකම වෙනස් කරන්න.
- **Colors/fonts**: `style.css` එකේ top එකේ `:root { ... }` කියන තැනින් වෙනස් කරන්න.
