// Deploy as a Web App: execute as owner, anonymous read access to this count only.
// The spreadsheet itself stays private. Never return row data or error details.
function doGet() {
  try {
    var cache = CacheService.getScriptCache();
    var payload = cache.get('echuu-beta-count-v1');
    if (!payload) {
      var sheet = SpreadsheetApp.openById('1xGpZ_7AVomTEf67T0xGDt5BpD2Wz2JNdQ9yOUKAbUac').getSheetByName('Sheet1');
      if (!sheet || sheet.getRange('B1').getDisplayValue().trim() !== 'Email') throw new Error('Schema changed');
      var lastRow = sheet.getLastRow();
      var rows = lastRow > 1 ? sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues() : [];
      var emails = new Set();
      rows.forEach(function (row) {
        var email = String(row[0]).trim().toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
      });
      payload = JSON.stringify({ count: emails.size, updatedAt: new Date().toISOString() });
      cache.put('echuu-beta-count-v1', payload, 300);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  } catch (_) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unavailable' })).setMimeType(ContentService.MimeType.JSON);
  }
}
