# Setup Guide - API Keys & Installation

Follow these steps to get your AI Video Generator up and running.

## Step 1: Install FFmpeg

FFmpeg is required for video processing.

### macOS
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### Windows
Download from: https://ffmpeg.org/download.html

### Verify Installation
```bash
ffmpeg -version
```
You should see version information. If you get "command not found", FFmpeg is not installed correctly.

## Step 2: Get OpenAI API Key

OpenAI provides both GPT-4 (for scripts) and TTS (for voiceover).

### Instructions:

1. **Create Account**
   - Go to: https://platform.openai.com/signup
   - Sign up with email or Google account

2. **Add Payment Method**
   - Go to: https://platform.openai.com/account/billing
   - Click "Add payment method"
   - Add credit card and load at least $5
   - Note: You'll only be charged for what you use (~$0.45 per video)

3. **Generate API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Give it a name like "AI Video Generator"
   - **IMPORTANT:** Copy the key immediately (starts with `sk-`)
   - You won't be able to see it again!

4. **Save Your Key**
   - Keep it somewhere safe
   - You'll need it in the next step

### Cost Breakdown:
- GPT-4 API calls: ~$0.35 per video
- TTS (text-to-speech): ~$0.12 per video
- **Total per video: ~$0.47**

## Step 3: Get Pexels API Key

Pexels provides free stock video footage.

### Instructions:

1. **Create Account**
   - Go to: https://www.pexels.com/
   - Click "Join" in top right
   - Sign up with email

2. **Access API**
   - Go to: https://www.pexels.com/api/
   - Click "Get Started" or "Your API Key"
   - You may need to describe your use case (just say "AI video generation prototype")

3. **Copy Your API Key**
   - Your API key will be displayed
   - It's a long alphanumeric string
   - Copy it for the next step

### Rate Limits:
- **Free tier:** 200 requests per hour
- More than enough for development and testing

## Step 4: Configure Environment Variables

Create a `.env` file in the project root directory:

```bash
cd /Users/catchup.life/OpusClip
touch .env
```

Open `.env` in your text editor and add:

```env
OPENAI_API_KEY=sk-proj-your-actual-key-here
PEXELS_API_KEY=your-actual-pexels-key-here
PORT=3000
```

**IMPORTANT:** 
- Replace `sk-proj-your-actual-key-here` with your actual OpenAI API key
- Replace `your-actual-pexels-key-here` with your actual Pexels API key
- Do NOT use quotes around the keys
- Do NOT commit this file to git (it's in .gitignore)

### Example .env file:
```env
OPENAI_API_KEY=sk-proj-abc123xyz789example
PEXELS_API_KEY=563492ad6f917000010000019a8b2c3d4e5f6789
PORT=3000
```

## Step 5: Verify Setup

Run a quick check to ensure everything is configured:

```bash
# Check Node.js version (should be 18+)
node --version

# Check FFmpeg
ffmpeg -version

# Check if directories exist
ls -la temp/ output/

# Check if .env exists
cat .env
```

## Step 6: Start the Server

```bash
npm start
```

You should see:
```
============================================================
🚀 AI Video Generator Ready!
============================================================

📍 Server: http://localhost:3000

✅ Requirements:
   • FFmpeg installed
   • OPENAI_API_KEY in .env
   • PEXELS_API_KEY in .env
```

## Step 7: Test It!

1. Open your browser to: http://localhost:3000
2. Enter a test prompt: "Make a video about coffee"
3. Click "Generate Video"
4. Wait 2-4 minutes (watch the console for progress)
5. The video should play automatically when complete!

## Common Issues

### Issue: "FFmpeg not found"
**Solution:** 
- Make sure FFmpeg is installed: `ffmpeg -version`
- Restart your terminal after installation
- On Mac, you may need to restart after `brew install ffmpeg`

### Issue: "Invalid API key"
**Solution:**
- Check your `.env` file
- Make sure the key starts with `sk-` for OpenAI
- Make sure there are no extra spaces or quotes
- Verify the key is correct in your OpenAI dashboard

### Issue: "Cannot find module 'openai'"
**Solution:**
```bash
npm install
```

### Issue: "Port 3000 already in use"
**Solution:**
- Change `PORT=3001` in your `.env` file
- Or kill the process using port 3000:
  ```bash
  lsof -ti:3000 | xargs kill
  ```

### Issue: "No videos found for keywords"
**Solution:**
- This is normal for very specific topics
- The system will automatically try a fallback search
- Check your Pexels API key if it keeps happening

## Security Notes

⚠️ **NEVER commit your `.env` file to git!**
- It contains your private API keys
- Anyone with your keys can use your accounts
- The `.gitignore` file prevents this by default

⚠️ **Keep your API keys secret**
- Don't share them in screenshots
- Don't post them in chat/forums
- Regenerate them if accidentally exposed

## Next Steps

Once everything works:

1. Try different prompts to see what videos it generates
2. Check the `output/` folder to see saved videos
3. Monitor your OpenAI usage at: https://platform.openai.com/usage
4. Experiment with different topics!

## Cost Monitoring

Track your OpenAI spending:
- Dashboard: https://platform.openai.com/usage
- Set spending limits in billing settings
- Each video costs ~$0.47
- 10 videos = ~$4.70
- 100 videos = ~$47

## Support

If you run into issues:
1. Check the terminal console for detailed error messages
2. Verify all prerequisites are installed
3. Make sure your `.env` file is configured correctly
4. Try the test prompt: "Make a video about coffee"

Enjoy creating AI-generated videos! 🎬

