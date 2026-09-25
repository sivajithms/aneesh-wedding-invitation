/**
 * Guestbook for the wedding invitation: saves RSVPs and blessings into this Google Sheet.
 * Setup: see README.md in this folder.
 *
 * Tabs are created on first use:
 *   RSVPs      one row per guest's phone; changing a reply updates that row
 *   Blessings  one row per blessing
 */

/**
 * Only needed if this script was created at script.google.com rather than from the sheet's
 * Extensions → Apps Script menu: paste the sheet's ID here (the long part of its URL between
 * /d/ and /edit). Leave empty for a script opened from the sheet.
 */
const SHEET_ID = '';

const TABS = {
  rsvp: { name: 'RSVPs', headers: ['Updated', 'Name', 'Reply', 'Guests', 'Reply ID'] },
  blessing: { name: 'Blessings', headers: ['Received', 'Name', 'Blessing'] },
};

const LIMITS = { name: 80, message: 300, guests: 20 };

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.type === 'rsvp') return saveRsvp(p);
    if (p.type === 'blessing') return saveBlessing(p);
    return reply({ ok: false, error: 'Unknown reply type.' });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'The guestbook couldn’t save that. Try again in a moment.' });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the /exec URL in a browser shows this, to confirm the deployment works. */
function doGet() {
  return reply({ ok: true, message: 'The wedding guestbook is running.' });
}

function saveRsvp(p) {
  const name = clean(p.name, LIMITS.name);
  if (!name) return reply({ ok: false, error: 'Add your name so the family knows who replied.' });
  const attending = p.attending === 'true';
  const guests = attending ? Math.min(Math.max(parseInt(p.guests, 10) || 1, 1), LIMITS.guests) : 0;
  const id = clean(p.id, 64);
  const row = [new Date(), name, attending ? 'Joyfully accepts' : 'Regretfully declines', guests, id];

  const sheet = tab(TABS.rsvp);
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 5, sheet.getLastRow() - 1, 1).getValues().flat() : [];
  const existing = id ? ids.indexOf(id) : -1;
  if (existing >= 0) sheet.getRange(existing + 2, 1, 1, row.length).setValues([row.map(safe)]);
  else sheet.appendRow(row.map(safe));
  return reply({ ok: true });
}

function saveBlessing(p) {
  const message = clean(p.message, LIMITS.message);
  if (!message) return reply({ ok: false, error: 'Write a few words before sending.' });
  tab(TABS.blessing).appendRow([new Date(), clean(p.name, LIMITS.name) || 'A guest', message].map(safe));
  return reply({ ok: true });
}

function tab({ name, headers }) {
  const book = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('No sheet: open this script from the sheet (Extensions → Apps Script) or set SHEET_ID.');
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

const clean = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Stops a guest's text being run as a spreadsheet formula (e.g. starting with "="). */
const safe = (value) => (typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : value);

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
