# DuoAxs Deep Link Overlay

This overlay:
1) Sends magic-link emails with an **app deep link** (`duoaxs://login-magic?...`) and a **web fallback**.
2) Adds iOS/Android association files so `https://app.duoaxs.com/*` can open the native app.

## Apply
Unzip this into the root of your DuoAxs repo, then:
- `apps/api/backend/src/routes/auth.magic.js` will replace the existing magic route.
- `apps/member/public/.well-known/*` will be created/updated.

## Configure
### API `.env`
```
DEEP_LINK_SCHEME=duoaxs
PUBLIC_MEMBER_BASE_URL=https://app.duoaxs.com
```

### iOS (Apple App Site Association)
- Replace `TEAMID` in `apps/member/public/.well-known/apple-app-site-association` with your **Apple Developer Team ID**.
- Ensure your iOS app bundle ID is `com.duoaxs.app` (or update `appID` accordingly).
- Deploy the member app so the file is served at:
  `https://app.duoaxs.com/.well-known/apple-app-site-association`

### Android (Digital Asset Links)
- Get your release keystore SHA256 fingerprint:
  ```bash
  keytool -list -v -keystore your-release.keystore -alias YOUR_ALIAS -storepass ***** -keypass *****
  ```
- Replace `REPLACE_WITH_YOUR_RELEASE_KEY_SHA256` in `apps/member/public/.well-known/assetlinks.json`.
- Deploy the member app so the file is served at:
  `https://app.duoaxs.com/.well-known/assetlinks.json`

## Test
- Install your test build on device.
- Open a magic email; tap **Open in DuoAxs app** (deep link) — should jump into the app.
- Paste `https://app.duoaxs.com/login-magic?token=...` in mobile Safari/Chrome — should prompt to open in the app.

If Universal/App Links don’t open, clear caches and verify the association files are accessible over HTTPS.
