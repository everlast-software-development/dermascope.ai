/**
 * DermaScope.ai — Early Access → Google Sheets
 * ---------------------------------------------------------------------------
 * A Google Apps Script Web App that appends every Early Access form submission
 * as a new row in the bound Google Sheet.
 *
 * The Node backend (server/server.js → appendToGoogleSheet) POSTs a JSON body to
 * this Web App after each successful submission. This script writes one row per
 * submission, creating the header row automatically on first use.
 *
 * See README.md in this folder for the full step-by-step deployment guide.
 */

// ─── Configuration ───────────────────────────────────────────────────────────

// Optional shared secret. If set to a non-empty string, incoming requests must
// include a matching "token". Keep this IDENTICAL to GOOGLE_SHEETS_SECRET in the
// Node backend's environment (.env). Leave '' to disable the check.
var SHARED_SECRET = '';

// The tab (sheet) name rows are written into. Created automatically if missing.
var SHEET_NAME = 'Early Access';

// Column headers, written to row 1 on first use. Order defines column order.
var HEADERS = [
  'Timestamp',
  'Full Name',
  'Professional Title',
  'Specialty',
  'Clinic / Hospital / Organization',
  'Country',
  'City',
  'Email Address',
  'Mobile / WhatsApp',
  'Type of Interest',
  'Physicians in Organization',
  'Current EMR / HIS',
  'Main Challenge to Solve',
  'Consent'
];

// ─── Web App entry points ────────────────────────────────────────────────────

/**
 * Handles the POST from the Node backend and appends a row.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Serialize concurrent writes so two submissions can't clobber the same row.
  lock.waitLock(30000);

  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    if (SHARED_SECRET && data.token !== SHARED_SECRET) {
      return jsonOutput_({ result: 'error', message: 'Unauthorized' });
    }

    var sheet = getSheet_();

    // Prefer the server-provided ISO timestamp so the sheet and the notification
    // email agree; fall back to the script's clock if it's missing.
    var timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    sheet.appendRow([
      timestamp,
      data.name         || '',
      data.title        || '',
      data.specialty    || '',
      data.organization || '',
      data.country      || '',
      data.city         || '',
      data.email        || '',
      data.phone        || '',
      data.interest     || '',
      data.physicians   || '',
      data.emr          || '',
      data.challenges   || '',
      data.consent      || ''
    ]);

    return jsonOutput_({ result: 'success' });
  } catch (err) {
    return jsonOutput_({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Simple health check — open the Web App URL in a browser to confirm it's live.
 */
function doGet() {
  return jsonOutput_({
    result: 'ok',
    message: 'DermaScope.ai Early Access endpoint is live.'
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  // Write (and style) the header row exactly once, on the first submission.
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
