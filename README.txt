DAILY POINTS V5.1 - iPhone persistence + End-of-Day fix

DAILY POINTS V5 - GITHUB PAGES

Files in this folder belong together at the ROOT of your GitHub repository:
index.html
styles.css
app.js
manifest.webmanifest
sw.js
icon.svg
README.txt

DEPLOY
1. Create or open your GitHub repository.
2. Delete/replace the older app files with ALL files from this folder.
3. Commit to the main branch.
4. Repository Settings > Pages > Build and deployment > Deploy from a branch.
5. Choose main and /(root), then Save.
6. Wait for the Pages deployment to finish.
7. Open the GitHub Pages URL in Safari and refresh once.
8. If you previously installed an older broken PWA, remove the old Home Screen icon and add the new page to Home Screen again so iOS does not hold onto stale app state/cache.

DATA
- Every interaction autosaves to localStorage.
- Historical daily scores remain separate from spending.
- Rewards subtract from wallet balance, not past scores.
- Export Backup in Settings creates a JSON backup.
- Restore Backup imports that JSON later.
- Clearing Safari/site data can remove local data, so export backups periodically.

NEW IN V5
- Rewards wallet and redemption history
- Savings goals
- End-of-day Met / Mostly / Not met habits
- No sweets/desserts
- No sugary soda/junk drinks
- Avoid heavily processed/junk food
- Perfect-day and category bonuses
- Grace Day
- Minimum Viable Day
- Scheduling and weekly quotas
- Reports, weak-habit view, monthly chart, streaks
- Reminders and instant autosave


V5.1 changes:
- Dual autosave: localStorage + IndexedDB shadow copy.
- Saves again on app background/pagehide.
- Restores whichever saved copy is newest.
- Requests persistent storage when supported.
- iPhone dynamic viewport and safe-area spacing fixes.
- End-of-Day jump button on Today.
- Fresh service-worker cache version to replace V5 assets.
