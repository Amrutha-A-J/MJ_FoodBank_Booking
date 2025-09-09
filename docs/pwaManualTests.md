# PWA Manual Test Script

## Installation

### Chrome on Android
1. Open the app URL in Chrome.
2. Wait for the install prompt or tap the browser menu and choose **Install app**.
3. Confirm the install and add the icon to the home screen.
4. Launch the app from the home screen and verify it opens full screen.

### Safari on iOS
1. Open the app URL in Safari.
2. Tap the **Share** icon and choose **Add to Home Screen**.
3. Accept the default name and tap **Add**.
4. Launch the app from the home screen and verify it opens without the Safari toolbar.

## Service worker

### First load
1. Clear existing app data.
2. Load the app with a network connection.
3. Confirm the service worker registers and caches assets.

### Reload
1. Reload the page.
2. Verify the app loads quickly from the service worker cache.

### Update
1. Deploy an updated service worker.
2. Open the existing app and refresh the page.
3. Confirm the new service worker activates and the app shows updated content.

## Clear caches
1. Uninstall the service worker and delete cached data.
2. Reload the app with a network connection.
3. Confirm the app loads normally.
