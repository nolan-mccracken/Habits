DAILY POINTS - GITHUB PAGES PWA (v4)

UPLOAD THESE FILES TO THE ROOT OF ONE GITHUB REPOSITORY:
- index.html
- styles.css
- app.js
- manifest.webmanifest
- sw.js
- icon.svg
- README.txt

DEPLOY:
1. GitHub > New repository (example: daily-points).
2. Upload ALL seven files above directly to the repository root.
3. Settings > Pages.
4. Source: Deploy from a branch.
5. Branch: main. Folder: / (root). Save.
6. Wait for the Pages URL, then open it in Safari on iPhone.
7. Safari Share > Add to Home Screen.

IMPORTANT IF YOU PREVIOUSLY DEPLOYED AN OLDER/BROKEN VERSION:
1. Replace every old file in the repository with this v4 set.
2. Wait for GitHub Pages to finish deploying.
3. Open the GitHub Pages URL in Safari and refresh it twice.
4. Fully close the old Home Screen app and reopen it.
5. If it still shows the old version, remove the Home Screen icon and add it again.
   Your habit data is stored in Safari site storage; removing the icon alone normally does not clear site storage.

DATA:
- Autosaves after each change using localStorage.
- Closing the app does not erase data.
- Export Backup creates a JSON backup file.
- Restore Backup loads that backup on this or another device.
- Clearing Safari website data can erase local data, so export backups periodically.

FEATURES:
- Daily / weekday / X-times-per-week scheduling
- Must / Should / Bonus tiers
- Minimum viable day
- Perfect-category bonus
- Weekly report and quotas
- Monthly points chart
- Habit streaks
- Browser reminders while page remains active
- Offline cache / PWA install support
- Autosave
- Backup / restore
