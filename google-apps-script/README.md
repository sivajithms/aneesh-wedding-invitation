# Guestbook: RSVPs and blessings into a Google Sheet

About five minutes, once.

1. Create a new Google Sheet (for example "Aneesh & Haseena — replies").
2. In the sheet: **Extensions → Apps Script**. Delete the sample code, paste in all of [`Code.gs`](Code.gs), and save.
3. **Deploy → New deployment**. Choose the type **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy** and allow the permissions Google asks for. The script only touches this one sheet.
5. Copy the **Web app URL** (it ends in `/exec`) and paste it into `guestbook.endpoint` in [`src/config/wedding.ts`](../src/config/wedding.ts).
6. Rebuild and redeploy the site.

To check it's working, open the `/exec` URL in a browser. It should say *"The wedding guestbook is running."* Then send a test RSVP from the invitation. An **RSVPs** tab appears in the sheet with the reply.

## What lands in the sheet

| Tab | Columns |
| --- | --- |
| RSVPs | Updated, Name, Reply (Joyfully accepts / Regretfully declines), Guests, Reply ID |
| Blessings | Received, Name, Blessing (up to 300 characters) |

Each phone gets its own Reply ID. A guest who changes their answer updates their existing row, so the sheet doesn't collect duplicates.

## Changing the script later

After editing `Code.gs`, go to **Deploy → Manage deployments → Edit → Version: New version → Deploy**. The URL stays the same.
