# JSU Drink Tracker

A web application for tracking drink consumption by event participants, built with **Vite**, **React**, **TailwindCSS** and **Supabase**. 

This tool allows event organizers to monitor and manage how many drinks participants have consumed via a QR-based scan and dashboard interface.

---

## 🚀 Features

- 🔐 Supabase Authentication for participant sign-in.
- 📊 Dashboard displaying real-time drink counts.
- 📦 QR Code system for quick participant access.
- 🔎 Participant search with instant results.

---

## ⚠️ Known Issue

🚧 **QR integration is incomplete.**  
Currently, scanning a QR code does not populate the participant’s name in the dashboard search bar.

**Expected Behavior:**  
When a QR code is scanned, the app should redirect to `/dashboard` and automatically populate the search bar with the participant’s name or ID.

---

## 📂 Project Structure

```JSU-drink-tracker/
├── backend/ # Express server for deployment on Render
├── dist/ # Production build output
├── public/ # Static assets
├── src/ # Main React codebase
├── supabase/ # Supabase client and utilities
├── index.html
├── package.json
└── vite.config.ts
```

## 🛠️ Tech Stack

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Render](https://render.com/) (Web Service Hosting)

---

## 🧪 Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start dev server
```bash
npm run dev
```

### 3. Build for production
```bash
npm run build
```

### 4. Start the backend server

```bash
npm start
```

