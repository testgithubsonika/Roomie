# Roomie 🏠

Welcome to **Roomie** – your smart roommate and room-finding platform! This project combines a modern React Native (Expo) app with powerful Supabase Edge Functions to match seekers and listers for the perfect living situation.

---

## 🚀 Project Overview
Roomie helps users:
- **Seekers:** Find the best-matched rooms based on preferences and AI-powered similarity search.
- **Listers:** List available rooms and connect with potential roommates.
- **Chat:** Communicate securely and efficiently.

---

## ✨ Features
- 🔒 **Authentication** (Supabase Auth)
- 🏠 **Room Listings** (Lister dashboard)
- 🤝 **Room Matching** (Seeker dashboard, AI-powered)
- 💬 **Chat** (Seeker-Lister communication)
- 📱 **Cross-platform** (iOS, Android, Web via Expo)
- ⚡ **Supabase Edge Functions** for fast, serverless backend logic

---

## 🛠️ Setup Instructions

### 1. **Clone the Repository**
```sh
git clone https://github.com/yourusername/roomie.git
cd Roomie
```

### 2. **Install Dependencies**
```sh
npm install
```

### 3. **Environment Variables**
Create a `.env` file in the project root:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```
*Get these from your [Supabase dashboard](https://app.supabase.com/).*

### 4. **Run the Expo App**
```sh
npx expo start
```

### 5. **Run Supabase Edge Functions Locally**
For example, to run the match-rooms function:
```sh
deno run --allow-read --allow-env --allow-net supabase/functions/match-rooms/index.ts
```
> **Note:** You need [Deno](https://deno.com/) installed.

### 6. **Deploy Edge Functions to Supabase**
```sh
supabase functions deploy match-rooms
```

---

## 🧪 Development Workflow
- **Expo app:** Hot reloads with `npx expo start`.
- **Edge Functions:** Edit and run with Deno locally, deploy with Supabase CLI.
- **Environment:** Keep your `.env` in the project root for local dev.

---

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request

All contributions are welcome! Please open issues for bugs or feature requests.

---

## 📄 License
MIT

---

## 🙏 Acknowledgements
- [Supabase](https://supabase.com/)
- [Expo](https://expo.dev/)
- [Deno](https://deno.com/)
- [Google Gemini API](https://ai.google.dev/)

---

> Made with ❤️ by the Roomie team
