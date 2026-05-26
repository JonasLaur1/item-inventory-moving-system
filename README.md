# BoxIt

A smart personal inventory and moving management mobile app built as a bachelor's degree project.

BoxIt helps you organize belongings into rooms and boxes, track packing progress, scan QR labels, and manage the entire moving process from one place.

## Features

- **Dashboard** — circular progress ring showing overall packing percentage and boxes left
- **Rooms** — create rooms, see per-room packing status (Empty / Started / Packing / Done), and filter by name or status
- **Inventory** — browse and manage all boxes across rooms with search and filtering
- **QR Scanning** — scan box QR labels with the camera to jump instantly to a box's detail screen
- **Moving Mode** — mark boxes as delivered at destination, track delivery progress per room
- **Activity Log** — full history of created, updated, moved, packed, and deleted events
- **Themes** — light and dark mode support

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| State | React hooks + Supabase Realtime |
| Storage | expo-secure-store (auth tokens) |
| QR | `qrcode` library + expo-camera |

## Project Structure

```
client/
├── app/
│   ├── (tabs)/         # Tab screens: Home, Inventory, Scan, Rooms, Activity
│   ├── box/[id].tsx    # Box detail screen
│   ├── room/[id].tsx   # Room detail screen
│   └── ...             # Auth screens (login, register, forgot password)
├── components/         # Reusable UI components
├── hooks/              # Data-fetching and state hooks
├── lib/                # Supabase client, auth service
├── utils/              # Helpers (QR generation, location icons, etc.)
└── constants/          # Theme tokens
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- **Android device** with USB debugging enabled, or an Android emulator (AVD) via Android Studio

> iOS is not covered here. The app targets Android.

### Environment Variables

Create `client/.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Install & Run

```bash
cd client
npm install
npx expo start
```

Once the dev server is running, press **`a`** to open on your connected Android device or emulator.

For a physical device, make sure USB debugging is enabled (Settings → Developer Options → USB Debugging) and the device is connected via USB before pressing `a`.

### Tests

```bash
cd client
npm test
```
