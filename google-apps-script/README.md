# Google Sheets integration — Early Access form

Every Early Access submission is emailed (unchanged) **and** appended as a row to a
Google Sheet. The email workflow is the source of truth; the Sheets append is
best-effort and can never block, delay, or break email.

- **Apps Script code:** [`Code.gs`](./Code.gs)
- **Backend hook:** `appendToGoogleSheet()` in [`../server/server.js`](../server/server.js)
- **Config:** `GOOGLE_SHEETS_WEBAPP_URL` (and optional `GOOGLE_SHEETS_SECRET`) in
  the server environment.

---

## Deployment guide (≈ 5 minutes)

### 1. Create the Google Sheet
1. Go to <https://sheets.google.com> and create a **Blank spreadsheet**.
2. Name it, e.g. `DermaScope.ai — Early Access`.
   (No need to add headers — the script creates them on the first submission.)

### 2. Add the Apps Script
1. In the sheet, open **Extensions → Apps Script**.
2. Delete any placeholder code in `Code.gs`.
3. Copy the **entire** contents of [`Code.gs`](./Code.gs) from this folder and paste it in.
4. *(Optional but recommended)* set a shared secret so only your backend can write:
   - In `Code.gs`, change `var SHARED_SECRET = '';` to e.g. `var SHARED_SECRET = 'a-long-random-string';`
   - You'll put the **same** value in the backend as `GOOGLE_SHEETS_SECRET` (step 5).
5. Click the **Save** (💾) icon.

### 3. Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Click the gear ⚙️ next to *Select type* → choose **Web app**.
3. Fill in:
   - **Description:** `Early Access endpoint` (anything)
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone**
     *(Required — this is the server-to-server call. Access is still protected by
     the optional shared secret. "Anyone" means anyone with the URL can POST; it
     does not expose your sheet, only this append endpoint.)*
4. Click **Deploy**.
5. Click **Authorize access**, pick your Google account, and on the
   "Google hasn't verified this app" screen click **Advanced → Go to … (unsafe)
   → Allow**. (This is normal for your own scripts.)
6. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfy…long…/exec`

### 4. Verify the endpoint
Paste the Web app URL into a browser. You should see:
```json
{"result":"ok","message":"DermaScope.ai Early Access endpoint is live."}
```

### 5. Connect it to the backend
Add the URL (and the secret, if you set one) to the server environment.

**Local dev** — edit [`../server/.env`](../server/.env):
```env
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/AKfy…/exec
GOOGLE_SHEETS_SECRET=a-long-random-string   # only if you set SHARED_SECRET in Code.gs
```

**Production (Railway)** — add the same two variables in the service's
**Variables** tab, then redeploy/restart.

### 6. Test end to end
1. Restart the server (`npm start` in `server/`).
   - On boot with the URL set, you'll see the normal startup log.
   - If the URL is missing you'll see: `ℹ GOOGLE_SHEETS_WEBAPP_URL not set — skipping Google Sheets append`.
2. Submit the Early Access form on the site.
3. Confirm: you still receive **both emails** (admin + user), **and** a new row
   appears in the sheet with a bold header row.
4. On success the server logs: `✓ Submission appended to Google Sheet`.

---

## Updating the script later

If you edit `Code.gs`, you must **re-deploy** for changes to take effect:
**Deploy → Manage deployments → (pencil ✏️) → Version: New version → Deploy**.
This keeps the **same URL**, so no backend change is needed.

## Column order written to the sheet
`Timestamp` · `Full Name` · `Professional Title` · `Specialty` ·
`Clinic / Hospital / Organization` · `Country` · `City` · `Email Address` ·
`Mobile / WhatsApp` · `Type of Interest` · `Physicians in Organization` ·
`Current EMR / HIS` · `Main Challenge to Solve` · `Consent`

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| No row appears, server logs `HTTP 401`/`Unauthorized` | `GOOGLE_SHEETS_SECRET` (backend) ≠ `SHARED_SECRET` (`Code.gs`). Make them identical, re-deploy the script. |
| Server logs `HTTP 302`/redirect issues | Ensure you're using the `/exec` URL (not `/dev`). The backend already follows redirects. |
| `GOOGLE_SHEETS_WEBAPP_URL not set` | Add the variable to `.env` / Railway and restart. |
| Emails work but no sheet row | That's by design if Sheets is misconfigured — email is never blocked. Check the server logs for the `Google Sheets append …` error line. |
| Edited `Code.gs` but nothing changed | You must **Manage deployments → New version** (see above). |
