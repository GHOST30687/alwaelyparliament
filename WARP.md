# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**البرلمان الطلابي - ثانوية الوائلي للمتميزين**  
A student parliament management web application for Al-Waely High School. Written in Arabic (RTL layout). Users include students (viewers), parliament members, and administrators.

## Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend**: Node.js + Express
- **Deployment**: Netlify (serverless functions)
- **Database**: JSONBin.io (3 bins: members, admins, announcements)
- **Language**: Arabic (RTL)

## Commands

### Development
```powershell
# Install dependencies
npm install

# Start local development server (port 3000)
npm start

# Manual test of local server
# Visit http://localhost:3000 in browser
```

### Deployment
The app auto-deploys to Netlify on git push. Netlify configuration is in `netlify.toml`.

## Architecture

### Dual Server Setup
This project has **two separate server implementations**:

1. **`server.js`** - Local development server (Express)
   - Direct Express routes with full error handling
   - Used when running `npm start`
   - Includes session management with device binding via tokens

2. **`netlify/functions/api.js`** - Serverless function (Netlify)
   - Wraps all API routes in a single Lambda handler
   - Used in production deployment
   - Simpler authentication (no persistent device binding)

**Important**: When modifying API logic, update BOTH files to maintain consistency between local and production environments.

### Data Flow

```
Client (app.js) 
  ↓ 
API Layer (server.js OR netlify/functions/api.js)
  ↓
JSONBin.io (3 bins via REST API)
```

### JSONBin Schema

**Members Bin** (`MEMBERS_BIN_ID`):
```json
{
  "members": ["MP001", "MP002", ...],
  "bindings": {
    "MP001": { "token": "ABC123...", "createdAt": "2025-..." }
  }
}
```

**Admins Bin** (`ADMINS_BIN_ID`):
```json
{
  "admins": ["ADM001", "ADM002", ...],
  "bindings": {
    "ADM001": { "token": "XYZ789...", "createdAt": "2025-..." }
  }
}
```

**Announcements Bin** (`ANNOUNCEMENTS_BIN_ID`):
```json
{
  "announcements": [
    {
      "id": "ANN-...",
      "title": "Title",
      "content": "Content",
      "createdAt": "2025-..."
    }
  ]
}
```

### User Roles & Permissions

| Role | Login Required | Can View Announcements | Can Post Announcements | Can View Members | Can Delete Members |
|------|----------------|------------------------|------------------------|------------------|-------------------|
| **Student** | No | ✓ | ✗ | ✗ | ✗ |
| **Member** (برلماني) | Yes (code + token) | ✓ | ✗ | ✓ | ✗ |
| **Admin** (مسؤول) | Yes (code + token) | ✓ | ✓ | ✓ | ✓ |

### Authentication System

- **Device Binding**: Each code (member/admin) can only bind to one device at a time
- **Session Token**: 32-character hex token generated on first login
- **Token Storage**: Stored in `bindings` object within respective bins
- **Persistence**: Tokens saved to `localStorage` for auto-login on return visits

### State Management

Application state is managed in a single `state` object in `app.js`:
```javascript
{
  loggedIn: boolean,
  isPublisher: boolean,  // Can post announcements
  isAdmin: boolean,      // Full administrative access
  code: string,          // User's code (MPxxx or ADMxxx)
  token: string,         // Session token
  memberName: string,    // Currently unused
  userType: string       // 'member', 'admin', or 'student'
}
```

### View States

The SPA has 4 main views controlled by showing/hiding sections:
1. **Landing** (`#landingView`) - Role selection (برلماني/طالب/مسؤول)
2. **Login** (`#loginView`) - Code entry for members/admins
3. **Announcements** (`#announcementsSection`) - Public feed with optional post form
4. **Members** (`#membersSection`) - Member list (authenticated users only)

### API Endpoints

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| POST | `/api/auth/login` | No | Login with code, returns token + role |
| POST | `/api/auth/check` | No | Check if code has publisher rights |
| GET | `/api/members` | Yes (query: `authCode`, `authToken`) | List all member codes |
| DELETE | `/api/members/:code` | Admin only | Remove a member |
| GET | `/api/announcements` | No | Fetch all announcements (sorted newest first) |
| POST | `/api/announcements` | Admin only | Post new announcement |
| GET | `/api/health` | No | Server health check (local only) |

### File Structure

```
.
├── index.html              # Main HTML (Arabic RTL)
├── app.js                  # Client-side JavaScript (SPA logic)
├── styles.css              # All styles (includes dark mode)
├── server.js               # Local Express server
├── netlify/
│   └── functions/
│       └── api.js          # Production serverless function
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies
└── assets/
    └── imgs/
        └── par-pic.jpg     # Favicon
```

## Key Features

### Dark Mode
- Toggle button in header
- Uses `data-theme="dark"` attribute on `<html>`
- Preference saved to `localStorage` as `theme` key

### Toast Notifications
- Custom toast system (no external library)
- Two types: `showSuccess()` and `showError()`
- Auto-dismiss after 3 seconds with manual close option

### Modal Dialogs
- `confirmDialog()` function for destructive actions
- Returns Promise<boolean>

## Working with JSONBin

### Configuration
JSONBin credentials are hardcoded in both server files:
- **`server.js`**: Lines 14-22 (JSONBIN_CONFIG object)
- **`netlify/functions/api.js`**: Lines 5-8

### API Headers
- Local: `X-Main-Key`
- Serverless: `X-Master-Key`
(Both work, but convention differs between implementations)

### Rate Limits
JSONBin free tier has request limits. The app doesn't implement retry logic or rate limit handling.

## Common Patterns

### Adding a New Member Code
Directly edit the JSONBin via web interface or add admin panel functionality. The format is:
```json
{
  "members": ["MP001", "MP002", "NEW_CODE"]
}
```

### Adding a New API Endpoint
1. Add route to `server.js` (e.g., `app.get('/api/new-endpoint', ...)`)
2. Add equivalent handler to `netlify/functions/api.js` serverless function
3. Add corresponding method to `API` object in `app.js`
4. Call the new API method where needed in client code

### Debugging Authentication Issues
Check these in order:
1. JSONBin API key validity (`/api/health` endpoint in local dev)
2. Bin IDs match between client and server
3. Token in localStorage matches binding in bin
4. Clock sync for `createdAt` timestamps

## Arabic/RTL Considerations

- All text content is in Arabic
- HTML has `lang="ar"` and `dir="rtl"`
- CSS uses logical properties where appropriate (`margin-inline-start`, etc.)
- Font stack: `Noto Kufi Arabic`, `Cairo`, system fallbacks
- Error messages and UI strings are in Arabic

## Environment Variables

The app **does not use** `.env` for production (though `dotenv` is installed). All configuration is hardcoded in server files. This is intentional for the deployment setup.

## Testing Locally

Since there are no automated tests:
1. Start server: `npm start`
2. Open http://localhost:3000
3. Test each user flow:
   - Student view (no login)
   - Member login with valid code
   - Admin login with admin code
   - Post announcement (admin only)
   - Delete member (admin only)
   - Theme toggle
   - Back button (logout)

## Deployment Notes

- Netlify automatically runs `npm install` (see `netlify.toml`)
- API routes are proxied via `[[redirects]]` rule
- No build step required (vanilla JS/HTML/CSS)
- Make sure JSONBin credentials are up-to-date in `netlify/functions/api.js` before deploying

## Code Style

- **JavaScript**: Compact ES6+ style, minimal whitespace, IIFE wrapper in `app.js`
- **CSS**: Custom properties for theming, BEM-lite naming, mobile-first responsive
- **HTML**: Semantic markup, minimal inline styles
- **Comments**: Arabic comments in code explaining functionality
