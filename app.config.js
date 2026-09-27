// A thin overlay on app.json, not a replacement for it — app.json stays the
// source of truth for everything static. This file only exists to inject the
// Android Google Maps API key from an environment variable at prebuild time,
// since a plain app.json can't read process.env and the key must never be
// committed to a public repo (Google's scanners revoke keys they find in one).
//
// Get a key from Google Cloud Console (APIs & Services > Credentials), with
// the "Maps SDK for Android" API enabled, and put it in your local .env as
// GOOGLE_MAPS_ANDROID_API_KEY=... (not EXPO_PUBLIC_ — this only needs to be
// read here at prebuild time, not bundled into the JS). For an EAS build, set
// it as an EAS secret instead: `eas secret:create --name
// GOOGLE_MAPS_ANDROID_API_KEY --value ...`. Without it, the Map tab keeps
// crashing on Android with "API key not found" exactly as it does today —
// this file only fixes how the key would be wired in, not the key itself.
const appJson = require('./app.json');

// Sign in with Apple needs an entitlement the App ID must also have, so it's
// only added once the feature is switched on (see src/lib/socialAuth.ts).
const appleSignIn = process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true';

module.exports = () => ({
  ...appJson.expo,
  plugins: [...appJson.expo.plugins, ...(appleSignIn ? ['expo-apple-authentication'] : [])],
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});
