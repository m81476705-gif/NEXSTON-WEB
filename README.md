# NEXSTON CITY ROLEPLAY — Website

GitHub Pages එකේ දාන්න simple, static SA:MP roleplay website එකක්. Live server status
(ONLINE/OFFLINE + players online + player නම් list) automatic-ව update වෙනවා.

## 📁 මොනවද තියෙන්නේ
```
index.html   → page structure
style.css    → design (dark city theme)
script.js    → live status + player roster logic
```

## 🚀 GitHub Pages එකට දාන්නේ කොහොමද

1. GitHub එකේ අලුත් repo එකක් හදන්න (උදා: `nexston-city-rp`)
2. මේ files 3 (`index.html`, `style.css`, `script.js`) repo එකේ root එකට (folder එකක් නෙවෙයි) upload කරන්න
3. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)` → **Save**
4. විනාඩි කීපයකින් `https://<ඔයාගෙ-username>.github.io/nexston-city-rp/` වලින් site එක ලයිව් වෙනවා

## ✅ Live status දැන් වැඩ කරන විදිහ

Website එක **SAMonitor** (sam.markski.ar) කියන public service එකෙන් ඔයාගෙ server එකට කෙළින්ම
**live query** එකක් යවනවා — SA:MP/open.mp master list එකට register වෙලා තියෙනවද කියලා බලන්නේ
නෑ, හැම විනාඩි 20කටම direct-ව server එකට ping කරලා දැනගන්නවා ONLINE ද OFFLINE ද කියලා. ඒ
කෙනාගෙන්ම **play කරන කට්ටියගෙ නම් list එකත්** (roster) ගන්නවා.

ඒ service එකෙන් response එකක් නැත්නම් විතරයි, backup විදිහට `api.open.mp/servers`
(master list) එක check කරනවා.

මේකෙන් server එක restart කරපු ගමන්ම, panel එකේ කිසිම config එකක් වෙනස් නොකරම, website එකේ
status එක accurate-ව පෙන්නනවා.

## ✏️ වෙනස් කරන්න ඕන දේවල්

- **Server IP/Port වෙනස් වුනොත්**: `script.js` එකේ `SERVER_IP` සහ `SERVER_PORT` වෙනස් කරන්න,
  සහ `index.html` එකේ `samp://...` links + `51.79.254.10:7774` හැම තැනකම වෙනස් කරන්න.
- **Discord link**: `index.html` එකේ `discord.gg/PGPsDgkps` හැම තැනකම වෙනස් කරන්න.
- **Colors/fonts**: `style.css` එකේ top එකේ `:root { ... }` කියන තැනින් වෙනස් කරන්න.

## ⚠️ Status "OFFLINE" කියලා පෙන්නනවනම්

1. Server එක ඇත්තටම running ද කියලා panel එකෙන් confirm කරන්න
2. Firewall/hosting provider එකෙන් **UDP port 7774** open ද කියලා අහන්න (SA:MP query protocol
   UDP හරහා යන්නේ — TCP විතරක් open නම් query එක fail වෙනවා)
3. Browser console එකේ (F12 → Console tab) error messages තියෙනවද බලන්න
