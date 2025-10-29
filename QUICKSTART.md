# Quick Start Guide

Get your AI Video Generator running in 5 minutes!

## Prerequisites Check

Before starting, verify you have:

```bash
# Node.js (should be v18+)
node --version

# FFmpeg (if not installed, see SETUP.md)
ffmpeg -version
```

If FFmpeg is missing:
- **Mac:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

## 1. Get API Keys

You need **2 API keys** (both are easy to get):

### OpenAI (GPT-4 + TTS)
1. Visit: https://platform.openai.com/api-keys
2. Create account + add $5 credit
3. Generate new key (starts with `sk-`)
4. Cost: ~$0.47 per video

### Pexels (Stock Videos)
1. Visit: https://www.pexels.com/api/
2. Sign up (free)
3. Get your API key
4. Cost: FREE

## 2. Configure Environment

Create a `.env` file in the project root:

```bash
cd /Users/catchup.life/OpusClip
nano .env
```

Add your keys:
```env
OPENAI_API_KEY=sk-your-actual-openai-key
PEXELS_API_KEY=your-actual-pexels-key
PORT=3000
```

Save and exit (Ctrl+X, then Y, then Enter)

## 3. Start Server

```bash
npm start
```

## 4. Generate Your First Video!

1. Open: http://localhost:3000
2. Enter prompt: "Make a video about why the sky is blue"
3. Click "Generate Video"
4. Wait 2-4 minutes ⏱️
5. Watch your video! 🎉

## What You'll Get

- 30-40 second video
- Professional AI voiceover
- Relevant stock footage
- Smooth transitions
- Burned-in captions
- 1080p quality

## Console Output

You'll see progress in the terminal:

```
============================================================
🎬 Starting Video Generation (ID: 1730217600000)
============================================================

📝 Generating storyboard with GPT-4...
✅ Generated 6 scenes

📥 Downloading clips...
  🔍 Searching: "blue sky clouds"
  ✅ Downloaded scene 0
  ...

⚙️ Processing clips...
  ⚙️ Processing scene 0...
  ✅ Processed scene 0
  ...

🎤 Generating voiceover with OpenAI TTS...
✅ Voiceover generated

🎬 Rendering final video with transitions...
  Progress: 25%
  Progress: 50%
  Progress: 75%
  Progress: 100%
✅ Video complete!

🧹 Cleaning up...

============================================================
✅ SUCCESS! Video saved: output/1730217600000.mp4
============================================================
```

## Example Prompts to Try

- "Make a video about why tennis balls are green"
- "Explain how coffee is made"
- "Tell the story of the internet"
- "Show why exercise is important"
- "Describe how airplanes fly"

## Troubleshooting

### "Invalid API key"
- Check your `.env` file
- Make sure keys don't have quotes or spaces
- Verify keys in your OpenAI/Pexels dashboards

### "FFmpeg not found"
- Install FFmpeg: `brew install ffmpeg` (Mac)
- Restart terminal after installation

### "Port 3000 already in use"
- Change `PORT=3001` in `.env`

## Files Created

After generating a video:

```
OpusClip/
├── output/
│   └── 1730217600000.mp4  ← Your generated video!
└── temp/                   ← Temporary files (auto-cleaned)
```

## Next Steps

- Read `README.md` for full documentation
- Read `SETUP.md` for detailed setup instructions
- Check your OpenAI usage: https://platform.openai.com/usage
- Monitor costs (each video ~$0.47)

## Need Help?

1. Check the terminal console for error messages
2. Review `SETUP.md` for detailed troubleshooting
3. Verify all prerequisites are installed
4. Make sure `.env` is configured correctly

Happy video generating! 🚀

