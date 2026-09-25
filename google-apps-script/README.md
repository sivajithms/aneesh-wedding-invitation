# Guestbook: RSVPs into a Google Sheet

About five minutes, once.

1. Open [script.google.com](https://script.google.com) and create a **New project**. Or, to use a sheet you already have, open it and choose **Extensions → Apps Script**.
2. Delete the sample code, paste in all of [`Code.gs`](Code.gs), and save.
3. In the toolbar's function menu (next to **Run**), choose **setup** and click **Run**. Allow the permissions Google asks for: **Advanced → Go to (project) → Allow**. The script only touches its own replies sheet. The **Execution log** then prints the sheet's link: *"Replies will be saved to: https://docs.google.com/…"*. For a new project, that's a sheet called "Wedding replies" in your Drive.
4. **Deploy → New deployment**. Choose the type **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with a Google account")
5. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`). Paste it into `guestbook.endpoint` in [`src/config/wedding.ts`](../src/config/wedding.ts).
6. Rebuild and redeploy the site.

Work Google accounts (Google Workspace) often don't offer **Anyone**. If the option is missing, set this up with a personal Gmail account.

To check it's working, open the `/exec` URL in a browser. It should say *"The wedding guestbook is running."* Then send a test RSVP from the invitation. An **RSVPs** tab appears in the sheet with the reply.

## What lands in the sheet

| Tab | Columns |
| --- | --- |
| RSVPs | Updated, Name, Reply (Joyfully accepts / Regretfully declines), Guests, Reply ID |

Each phone gets its own Reply ID. A guest who changes their answer updates their existing row, so the sheet doesn't collect duplicates.

## Changing the script later

After editing `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same.
