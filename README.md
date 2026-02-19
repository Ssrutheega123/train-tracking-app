# 🚂 Train Destination Alarm — Complete Setup & Testing Guide

A **real-time geofencing alarm** for train travel. Never miss your destination again.
Works as a Progressive Web App (PWA) — install it on your phone like a native app.

---

## 📁 Project Structure

```
train-alarm-app/
├── backend/               ← Node.js + Express (Port 5000)
│   ├── index.js           ← Main server + /api/train/:no + /api/demo/:no
│   ├── .env               ← PORT, SCRAPER_URL
│   └── package.json
│
├── frontend/
│   └── public/
│       ├── index.html     ← Complete React SPA (all-in-one, no build needed)
│       ├── sw.js          ← Service Worker (background tracking + notifications)
│       └── manifest.json  ← PWA config (install on phone)
│
├── TrainTrack/            ← Python FastAPI scraper (Port 8000)
│   ├── app/
│   │   └── main.py        ← Scrapes NTES + RailYatri for live data
│   └── requirements.txt
│
└── package.json           ← Root scripts (concurrently)
```

---

## ⚡ Quick Start (3 Services)

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.11 + `uv` package manager (`pip install uv`)

### Step 1 — Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### Step 2 — Install Python Dependencies
```bash
cd TrainTrack
uv venv              # Create virtual environment
uv pip install -r requirements.txt
cd ..
```

### Step 3 — Start Everything
```bash
# Option A: Backend + Frontend only (Demo mode works, Live mode needs Python too)
npm run dev

# Option B: All 3 services at once
npm run dev:full
```

### Step 4 — Open the App
```
http://localhost:3000
```

---

## 🧪 DEMO MODE — Test Without a Real Train

> **For college project submission demos, this is all you need!**

### Method 1: Built-in Simulation (Recommended)
1. Open `http://localhost:3000`
2. Click the **🎬 Demo Mode** tab
3. Enter any 5-digit number e.g. **`12043`** → click **→**
4. The app loads the **Chennai → Coimbatore** mock route (real coordinates)
5. Select a **middle station** as your destination (e.g. "Salem Junction")
6. Set **Speed to 200×** using the slider
7. Click **▶ Start Simulation**
8. Watch the **blue dot travel the route** on the map
9. **Alarm fires automatically** when it reaches your station! 🔔

**What the demo shows:**
- ✅ Real Haversine distance calculations (shrinking live in UI)
- ✅ Progress bar updating as train moves
- ✅ Alarm state transitions: `safe → approaching → pre-alert → alarm`
- ✅ Map marker moving along the route
- ✅ Browser notification (allow when prompted)
- ✅ Audio alarm (synthesized, no MP3 needed)
- ✅ Vibration on mobile
- ✅ Dismiss / Snooze buttons

### Method 2: Manual GPS Override (Chrome DevTools)
Test with real GPS coordinates in your browser:
1. Open **Chrome DevTools** → **More Tools** → **Sensors**
2. Under **Geolocation**, set custom coordinates
3. Paste coordinates along the route (see table below)
4. Start GPS tracking in **Live Mode** — distance updates in real time!

| Station          | Latitude   | Longitude  |
|------------------|-----------|------------|
| Chennai Central  | 13.0827   | 80.2707    |
| Katpadi Jn       | 12.9698   | 79.1487    |
| Jolarpettai      | 12.5667   | 78.5833    |
| Salem Jn         | 11.6643   | 78.1460    |
| Erode Jn         | 11.3410   | 77.7172    |
| **Tiruppur** 📍  | **11.1085**| **77.3411**|
| Coimbatore Jn    | 11.0168   | 76.9558    |

**Steps:**
1. Set Coimbatore Jn as your destination (threshold: 2 km)
2. In DevTools Sensors, enter Tiruppur coordinates (11.1085, 77.3411)
3. Click **Start GPS Tracking** in Live Mode
4. The alarm triggers because Tiruppur is ~12 km from Coimbatore
5. Move coordinates closer to 11.0168, 76.9558 → **ALARM fires within 2 km!**

### Method 3: API-only Testing (curl)
```bash
# Health check
curl http://localhost:5000/api/health

# Demo route (no Python scraper needed)
curl http://localhost:5000/api/demo/12043

# Live route (requires Python service running)
curl http://localhost:5000/api/train/12163
```

---

## 🔴 Live Mode (Real Train Data)

### Start Python Scraper
```bash
cd TrainTrack
source venv/bin/activate   # Linux/Mac
# OR: venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Verify Scraper is Working
```bash
curl http://localhost:8000/health
curl http://localhost:8000/demo/12043
curl http://localhost:8000/train/12163   # Requires real train running today
```

### Popular Train Numbers to Test
| Train No | Name                        | Route                    |
|----------|-----------------------------|--------------------------|
| 12163    | Chennai Egmore–Coimbatore   | MAS → CBE                |
| 12043    | New Delhi–Bhopal Shatabdi   | NDLS → BPL               |
| 12951    | Mumbai Rajdhani             | BCT → NDLS               |
| 12301    | Howrah Rajdhani             | HWH → NDLS               |
| 22691    | Rajdhani Express            | SBC → NDLS               |

> ⚠️ **Note:** Scraping Indian Railways can be unreliable due to anti-bot measures.
> The backend falls back gracefully and the Demo endpoint always works.

---

## 🏗️ How It Works — Technical Deep Dive

### The Alarm Logic Flow

```
User enters train + destination
        ↓
Backend fetches route (coordinates for each station)
        ↓
Browser starts navigator.geolocation.watchPosition()
        ↓ (every GPS update)
Haversine formula calculates distances:
  • distToDest   = distance from user to destination
  • distToPrev   = distance from user to previous station
        ↓
State machine evaluates:
  distToDest > 15km              → "safe"       (green)
  distToDest ≤ 15km              → "approaching" (yellow)
  distToPrev ≤ 0.5km             → "pre-alert"  (orange) + vibrate
  distToDest ≤ 2km               → "ALARM" 🔔   (red) + audio + notification
        ↓
Service Worker shows persistent notification
AudioContext plays synthesized alarm (square wave oscillator)
navigator.vibrate() pulses device
```

### The Haversine Formula (implemented in JS)
```js
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180)
    * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

### Why Service Workers?
- **Problem:** When phone screen turns off, browser tabs get throttled/suspended
- **Solution:** Service Worker runs in a separate thread outside the page lifecycle
- The main thread sends `postMessage({ type: 'TRIGGER_ALARM' })` to the SW
- SW calls `showNotification()` — this works even with the screen off
- Notification stays visible until dismissed (`requireInteraction: true`)

### Adaptive GPS Accuracy
```
Distance > 50 km → LOW accuracy  (maximumAge: 60s, battery-efficient)
Distance < 50 km → HIGH accuracy (maximumAge: 5s,  precise)
```

### Offline Support
When the train enters a tunnel (no internet):
1. Station coordinates are already cached by the Service Worker
2. Haversine calculation runs entirely client-side — no network needed
3. GPS from the phone hardware still works offline
4. The alarm still fires! 🎉

---

## 📱 Installing as a Mobile App (PWA)

### Android (Chrome)
1. Open `http://YOUR_PC_IP:3000` in Chrome on your phone
2. Tap the **⋮ menu** → **Add to Home Screen**
3. App icon appears on home screen — works like a native app!

### iOS (Safari)
1. Open in Safari → **Share** → **Add to Home Screen**

> To access from your phone, find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
> Then open `http://192.168.x.x:3000` on your phone

---

## 🛠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| GPS permission denied | Enable in browser settings → Site Settings → Location |
| No sound | Click "Start Tracking" first (browser requires user gesture for audio) |
| Backend CORS error | Make sure backend is running on port 5000 |
| Python scraper fails | Use Demo Mode — it always works |
| Map not loading | Check internet connection (map tiles need CDN) |
| `require is not defined` | backend/package.json must NOT have `"type": "module"` |

---

## 🎓 For College Project Demo Checklist

- [ ] Start backend: `cd backend && npm start`
- [ ] Start frontend: `npx serve -s frontend/public -p 3000`
- [ ] Open `http://localhost:3000`
- [ ] Switch to **Demo Mode** tab
- [ ] Enter `12043` → search
- [ ] Select **Salem Junction** as destination
- [ ] Set speed to **300×**
- [ ] Click **Start Simulation**
- [ ] Show the distance counter shrinking live
- [ ] Let alarm fire — show notification + audio
- [ ] Click **I'm Awake** to dismiss
- [ ] Optionally show Chrome DevTools GPS override for extra points ✨

---

## 🧩 Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React 18 (CDN, no build) | Fast prototyping, no webpack needed |
| Maps | Leaflet.js | Free, open-source, dark tile support |
| Geolocation | Web Geolocation API | Native browser, no library needed |
| Distance | Haversine formula (JS) | Client-side, works offline |
| Audio | Web Audio API | No MP3 files needed, synthesized |
| Background | Service Workers | Notifications survive screen lock |
| Backend | Node.js + Express | Proxy/bridge to Python service |
| Scraper | Python FastAPI + httpx + BeautifulSoup | Async scraping |
| Packaging | PWA + manifest.json | Installable as mobile app |
