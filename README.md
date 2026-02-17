# Cruxbook

A bouldering guidebook app. Built with Expo and Supabase.

## Setup

1. **Supabase** – Uses your existing project. Ensure `.env` has:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. **Auth** – Enable Email in Supabase → Authentication → Providers.

3. **Storage** – Create an `avatars` bucket (Storage → New bucket, name: avatars, public: yes). Add policy: allow authenticated users to upload to their folder `{user_id}/*`.

4. **Start**:
   ```bash
   npx expo start --web
   ```

## Features

- **Login** – Sign in / sign up with email and username
- **Areas** – List and add climbing areas
- **Profile** – Update username and profile picture
