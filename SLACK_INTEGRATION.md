# Slack Integration Setup Guide

This guide will help you set up a Slack slash command to automatically create enhancement requests in your tracker.

## Overview

Users can create quick enhancement requests directly from Slack using a slash command like:
```
/enhancement_request Add dark mode to the dashboard
```

The request will be created with sensible defaults and can be enriched later in the webapp.

## Prerequisites

- A Slack workspace where you have permissions to install apps
- Your Enhancement Tracker server running and accessible (with HTTPS for production)
- Access to your Slack App configuration

## Step 1: Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter:
   - **App Name**: Enhancement Request Bot (or your preferred name)
   - **Workspace**: Select your workspace
5. Click **"Create App"**

## Step 2: Create a Slash Command

1. In your app settings, go to **"Slash Commands"** in the left sidebar
2. Click **"Create New Command"**
3. Configure the command:
   - **Command**: `/enhancement_request`
   - **Request URL**: `https://enhancement-tracker.vercel.app/api/slack/new-request`
     - For local testing with ngrok: `https://abc123.ngrok.io/api/slack/new-request`
   - **Short Description**: Request Submission
   - **Usage Hint**: Description of Request
4. Click **"Save"**

## Step 3: Get Your Signing Secret

1. In your app settings, go to **"Basic Information"**
2. Scroll to **"App Credentials"**
3. Find **"Signing Secret"**
4. Click **"Show"** and copy the secret

## Step 4: Configure Your Server

Add the Slack signing secret to your environment variables:

### For Local Development (`env.local`):
```env
SLACK_SIGNING_SECRET=your_signing_secret_here
```

### For Production (Vercel):
```bash
vercel env add SLACK_SIGNING_SECRET
# Paste your signing secret when prompted
# Select: Production
```

Or add it via Vercel Dashboard:
1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Name**: `SLACK_SIGNING_SECRET`
   - **Value**: Your signing secret
   - **Environment**: Production

## Step 5: Install the App to Your Workspace

1. In your app settings, go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**

## Step 6: Test the Integration

In any Slack channel:
```
/enhancement_request Add a feature to export reports as PDF
```

You should receive a response like:
```
✅ Enhancement request created: REQ-000123

Description: Add a feature to export reports as PDF

Note: This request has been created with default values. Please enrich it in the tracker webapp.
```

## Default Values

Requests created via Slack are assigned these defaults:

| Field | Default Value | Can Edit Later |
|-------|---------------|----------------|
| **Request Name** | "Slack Request: [first 50 chars]..." | ✅ Yes |
| **Request Description** | Full text from Slack | ✅ Yes |
| **Rationale** | "Submitted via Slack by [username] - to be enriched" | ✅ Yes |
| **Requestor Name** | Slack username | ✅ Yes |
| **Date of Request** | Today's date | ✅ Yes |
| **Type of Request** | Enhancement (Feature) | ✅ Yes |
| **Area of Product** | Buyer Portal | ✅ Yes |
| **Desire Level** | Nice-to-have | ✅ Yes |
| **Who Benefits** | Internal | ✅ Yes |
| **Status** | submitted | ✅ Yes |
| **Priority Level** | Medium | ✅ Yes |
| **Stakeholder** | Slack channel name | ✅ Yes |

All other fields are left empty for manual enrichment.

## Customizing Default Values

To change the default values, edit the `enhancementData` object in `server-supabase.js` at line ~997:

```javascript
const enhancementData = {
    // ... other fields ...
    type_of_request: 'Enhancement (Feature)', // Change this
    area_of_product: 'Buyer Portal',          // Change this
    desire_level: 'Nice-to-have',             // Change this
    who_benefits: 'Internal',                 // Change this
    priority_level: 'Medium'                  // Change this
};
```

**Valid options for each field:**

- **type_of_request**: `Bug Fix`, `New Feature`, `Enhancement (UI)`, `Enhancement (Feature)`
- **area_of_product**: `Buyer Portal`, `Supplier Hub`, `Procurement`, `Guides`, `Documentation`
- **desire_level**: `Must-have`, `Nice-to-have`
- **who_benefits**: `Internal`, `Clients - procurement`, `Clients - end users`, `Suppliers` (can be comma-separated)
- **priority_level**: `Critical`, `High`, `Medium`, `Low`

## Security

The integration includes several security measures:

1. **Request Signature Verification**: All Slack requests are cryptographically verified using your signing secret
2. **Timestamp Validation**: Requests older than 5 minutes are rejected (prevents replay attacks)
3. **Rate Limiting**: Maximum 50 requests per 15 minutes per IP address
4. **No Authentication Required**: The Slack endpoint bypasses your webapp's auth to allow quick submissions

## Troubleshooting

### Command Not Appearing
- Make sure you've installed the app to your workspace
- Try typing `/` in Slack to see if the command appears in the list
- Re-install the app if needed

### "Invalid request signature" Error
- Double-check your `SLACK_SIGNING_SECRET` environment variable
- Make sure there are no extra spaces or quotes
- Restart your server after adding the environment variable

### Request Not Created
- Check your server logs for error messages
- Verify your database connection is working
- Ensure all required fields have valid default values

### Testing Locally with ngrok
1. Install ngrok: `npm install -g ngrok`
2. Start your server: `npm run dev`
3. In another terminal: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update your Slack command's Request URL to: `https://abc123.ngrok.io/api/slack/new-request`

## Endpoint Details

**Endpoint**: `POST /api/slack/new-request`

**Request Format** (from Slack):
```
text: "User's enhancement description"
user_id: "U01234567"
user_name: "john.doe"
channel_name: "general"
```

**Response Format**:
```json
{
  "response_type": "ephemeral",
  "text": "✅ Enhancement request created: REQ-000123..."
}
```

**Rate Limit**: 50 requests per 15 minutes per IP

**Authentication**: Slack request signature verification (no user auth required)

## Example Usage

In any Slack channel or DM:
```
/enhancement_request Add dark mode to the dashboard
/enhancement_request Fix the export button on the reports page
/enhancement_request Support for bulk CSV uploads in procurement module
```

## Next Steps

After setting up:

1. Test the integration in a private Slack channel first
2. Communicate the new feature to your team
3. Create a workflow guide for enriching Slack-submitted requests
4. Monitor the "submitted" status filter in your webapp for new Slack requests

## Support

For issues or questions:
- Check server logs: `npm run dev` (development) or check Vercel logs (production)
- Review Slack API logs at [https://api.slack.com/apps](https://api.slack.com/apps)
- Verify environment variables are set correctly
