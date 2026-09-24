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

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
});
