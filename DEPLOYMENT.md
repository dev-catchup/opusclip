# Deployment Guide - Password Protected Demo

## Overview

The AI Video Generator now includes password protection, making it safe to deploy publicly and share with specific people (like interviewers).

## Password Protection Features

✅ **Login Required** - All pages require authentication  
✅ **Session-Based** - Stays logged in for 24 hours  
✅ **Protected APIs** - All video generation endpoints require auth  
✅ **Logout Button** - Easy to log out from main interface  
✅ **Simple Setup** - Single password in environment variable  

## Setting Up the Password

### 1. Update Your `.env` File

Add this line to your `.env` file:

```env
DEMO_PASSWORD=your_secure_password_here
SESSION_SECRET=your_random_session_secret_here
```

**Example:**
```env
OPENAI_API_KEY=sk-your-key
PEXELS_API_KEY=your-key
PORT=3000
DEMO_PASSWORD=TennisBalls2024!
SESSION_SECRET=random-long-string-for-session-encryption
```

### 2. Generate a Strong Session Secret

You can use this command to generate a random session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Default Password

If you don't set `DEMO_PASSWORD`, the default password is: **`demo2024`**

**⚠️ WARNING:** Always set a custom password for production deployments!

## How It Works

### Login Flow

1. User visits your site
2. Automatically redirected to `/login.html`
3. Enters password
4. If correct → redirected to main app
5. Session persists for 24 hours
6. Can logout anytime via "Logout" button

### What's Protected

- ✅ Main application (`/`)
- ✅ Video generation endpoint (`/generate`)
- ✅ Generated videos (`/output/*`)
- ✅ All authenticated routes

### What's Public

- ✅ Login page (`/login.html`)
- ✅ Health check (`/health`) - for monitoring

## Sharing With Interviewer

### Option 1: Share Password Directly

Send them:
```
Demo URL: https://your-site.com
Password: TennisBalls2024!

The demo generates AI videos from text prompts.
Try: "Make a video about why tennis balls are green"
```

### Option 2: Include in Email

```
Hi [Interviewer Name],

I've set up the AI Video Generator demo for you to review:

URL: https://your-site.com
Password: [your-password]

The application generates complete videos with AI voiceover and 
smooth transitions from a single text prompt. Try prompting it with
topics like "why tennis balls are green" or "how coffee is made".

Best regards,
[Your Name]
```

## Deployment Platforms

### Deploy to Heroku

1. **Create Heroku App**
```bash
heroku create your-app-name
```

2. **Set Environment Variables**
```bash
heroku config:set OPENAI_API_KEY=sk-your-key
heroku config:set PEXELS_API_KEY=your-key
heroku config:set DEMO_PASSWORD=YourPassword123
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set NODE_ENV=production
```

3. **Add FFmpeg Buildpack**
```bash
heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
heroku buildpacks:add heroku/nodejs
```

4. **Deploy**
```bash
git push heroku main
```

### Deploy to Railway

1. **Connect GitHub Repo**
2. **Add Environment Variables** in Railway dashboard:
   - `OPENAI_API_KEY`
   - `PEXELS_API_KEY`
   - `DEMO_PASSWORD`
   - `SESSION_SECRET`
   - `NODE_ENV=production`
3. **Deploy** (automatic)

### Deploy to Render

1. **Create New Web Service**
2. **Connect Repository**
3. **Add Environment Variables**
4. **Set Build Command**: `npm install`
5. **Set Start Command**: `npm start`
6. **Deploy**

## Security Best Practices

### ✅ DO

- Use a strong, unique password
- Generate a random session secret
- Use HTTPS in production
- Keep `.env` file in `.gitignore`
- Change password regularly
- Use environment variables for all secrets

### ❌ DON'T

- Use default password (`demo2024`) in production
- Commit `.env` file to git
- Share password over unsecured channels
- Use the same password as other services
- Hard-code passwords in source code

## Session Configuration

Current session settings:

- **Duration**: 24 hours
- **HTTP Only**: Yes (prevents XSS)
- **Secure**: Auto (HTTPS in production)
- **Storage**: In-memory (server restart = logout)

For production with multiple servers, consider:
- Redis session store
- PostgreSQL session store
- Shorter session duration (1-2 hours)

## Troubleshooting

### "Unauthorized" Error
- Clear browser cookies
- Try incognito/private window
- Check password is correct
- Verify `.env` file has `DEMO_PASSWORD`

### Session Not Persisting
- Check server isn't restarting
- Verify cookies are enabled
- Check for `SESSION_SECRET` in `.env`

### Can't Access After Login
- Check browser console for errors
- Verify session middleware is working
- Try clearing cookies and logging in again

## Monitoring

The health endpoint is public for monitoring:

```bash
curl https://your-site.com/health
# Response: {"status":"ok"}
```

## Disabling Password Protection

If you want to remove password protection for local development:

1. Comment out the `requireAuth` middleware:

```javascript
// app.get('/', requireAuth, (req, res) => {
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// app.post('/generate', requireAuth, async (req, res) => {
app.post('/generate', async (req, res) => {
  // ...
});
```

2. Or set environment variable:
```env
DISABLE_AUTH=true
```

## Cost Considerations

- Session storage: In-memory (free, resets on restart)
- No database needed: Simple password check
- API costs unchanged: ~$0.47 per video

## Example Production `.env`

```env
# API Keys
OPENAI_API_KEY=sk-proj-abc123xyz789...
PEXELS_API_KEY=1234567890abcdef...

# Server Config
PORT=3000
NODE_ENV=production

# Security
DEMO_PASSWORD=StrongPassword123!WithSymbols
SESSION_SECRET=64-character-random-hex-string-here

# Optional
DISABLE_AUTH=false
```

## Support

If you have issues with authentication:

1. Check server logs for errors
2. Verify all environment variables are set
3. Test with default password `demo2024`
4. Try a new incognito window

---

**Ready to share your demo safely!** 🔒

The password protection makes it perfect for:
- Job interviews
- Client demos
- Investor presentations
- Beta testing
- Private showcases

