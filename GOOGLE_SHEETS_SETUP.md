# Google Sheets Feedback Setup Guide

This guide will help you set up a Google Sheets-based feedback collection system for SkieVision. The feedback modal will send user feedback (ratings, categories, and comments) to your Google Sheet.

## Prerequisites

- A Google account
- Access to Google Sheets and Google Apps Script

## Step-by-Step Setup

### 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it something like "SkieVision Feedback"
4. In the first row, add the following headers:
   - `A1`: **Timestamp**
   - `B1`: **Rating**
   - `C1`: **Category**
   - `D1`: **Comment**

### 2. Open Apps Script Editor

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. This will open the Apps Script editor in a new tab
3. Delete any existing code in the editor

### 3. Add the Apps Script Code

Copy and paste the following code into the Apps Script editor:

```javascript
function doPost(e) {
  try {
    // Get the active spreadsheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);
    
    // Extract feedback fields
    var timestamp = new Date();
    var rating = data.rating || 'N/A';
    var category = data.category || 'N/A';
    var comment = data.comment || '(No comment)';
    
    // Append a new row with the feedback data
    sheet.appendRow([
      timestamp,
      rating,
      category,
      comment
    ]);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'success',
      'message': 'Feedback recorded successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      'result': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 4. Deploy the Apps Script

1. Click the **Deploy** button in the top-right corner
2. Select **New deployment**
3. Click the gear icon ⚙️ next to "Select type" and choose **Web app**
4. Configure the deployment:
   - **Description**: "Feedback Collection API" (or any description you prefer)
   - **Execute as**: Select "Me (your email)"
   - **Who has access**: Select "Anyone" (this is required for the feedback form to work)
5. Click **Deploy**
6. You may be prompted to authorize the script:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** → **Go to [Your Project Name] (unsafe)**
   - Click **Allow**
7. After authorization, you'll see a deployment confirmation with a **Web app URL**

### 5. Copy the Web App URL

The URL will look something like this:
```
https://script.google.com/macros/s/AKfycbx... [long string] .../exec
```

**This is your feedback sheet URL!** Copy it.

### 6. Add to Your Environment Variables

1. In your SkieVision project, open or create a `.env` file in the root directory
2. Add the following line with your actual URL:

```env
VITE_FEEDBACK_SHEET_URL=https://script.google.com/macros/s/YOUR_ACTUAL_SCRIPT_ID/exec
```

Replace `YOUR_ACTUAL_SCRIPT_ID` with the URL you copied in step 5.

### 7. Restart Your Development Server

If you're running the dev server, restart it to pick up the new environment variable:

```bash
npm run dev
```

## Testing the Integration

1. Open your SkieVision application
2. Click the **Feedback** button in the navigation bar
3. Fill out the feedback form:
   - Rate your experience (1-5 stars)
   - Select a category (Quality, Bug, or Feature)
   - Optionally add a comment
4. Click **Send Feedback**
5. Check your Google Sheet - you should see a new row with the feedback data!

## Data Format

The feedback data sent to Google Sheets includes:

| Field | Type | Description |
|-------|------|-------------|
| Timestamp | Date/Time | Automatically generated when feedback is received |
| Rating | Number (1-5) | User's star rating |
| Category | String | One of: "quality", "bug", or "feature" |
| Comment | String | User's optional comment (defaults to "(No comment)") |

## Troubleshooting

### Feedback not appearing in the sheet?

1. **Check the deployment**: Make sure the script is deployed with "Who has access" set to "Anyone"
2. **Verify the URL**: Ensure you copied the full Web app URL (ends with `/exec`)
3. **Check browser console**: Open browser DevTools and look for any error messages
4. **Check Apps Script logs**: In the Apps Script editor, go to **Execution log** to see if the script is receiving requests

### Permission issues?

- The script must be deployed with "Execute as: Me" and "Who has access: Anyone"
- Make sure you authorized the script during deployment
- Try redeploying and authorizing again

### Sheet not updating?

- Make sure the sheet has headers in the first row (Timestamp, Rating, Category, Comment)
- Check that the script is pointing to the correct sheet (first sheet in the spreadsheet)
- Look at the Apps Script execution logs for error messages

## Optional: Formatting Your Sheet

To make your feedback sheet more readable:

1. **Freeze the header row**: View → Freeze → 1 row
2. **Auto-resize columns**: Select all columns → Right-click → Resize columns → Fit to data
3. **Format timestamp**: Select column A → Format → Number → Date time
4. **Add conditional formatting for ratings**:
   - Select the Rating column
   - Format → Conditional formatting
   - Set rules to color-code ratings (e.g., 1-2 = red, 3 = yellow, 4-5 = green)

## Security Note

The Apps Script web app is set to "Anyone" access, which means anyone with the URL can send data to your sheet. This is necessary for the feedback form to work without requiring authentication. The URL acts as a "secret" - don't share it publicly beyond your application's frontend code.

If you need to restrict access further, you would need to implement authentication in the Apps Script, which is beyond the scope of this basic setup.

## Additional Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Web Apps Guide](https://developers.google.com/apps-script/guides/web)
- [SpreadsheetApp Service](https://developers.google.com/apps-script/reference/spreadsheet)
