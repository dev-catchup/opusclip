# AI Video Generation Agent

Generate complete videos with AI script, voiceover, and smooth transitions from a single text prompt.

## Features

- ✅ **AI-Generated Scripts** - GPT-4 creates engaging video narratives
- ✅ **Professional Voiceover** - OpenAI TTS generates natural speech
- ✅ **Stock Footage** - Automatically finds relevant clips from Pexels
- ✅ **Smooth Transitions** - 0.5s cross-fade between scenes
- ✅ **Burned-in Captions** - Professional subtitles
- ✅ **1080p HD Quality** - Ready for social media

## Prerequisites

### 1. Node.js
Make sure you have Node.js 18+ installed:
```bash
node --version
```

### 2. FFmpeg
FFmpeg must be installed on your system:

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

### 3. API Keys

You need two API keys:

#### OpenAI API Key (Required for GPT-4 + TTS)
1. Go to https://platform.openai.com/api-keys
2. Create account and add payment method ($5 minimum)
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

**Cost:** ~$0.45-0.55 per video

#### Pexels API Key (Required for Stock Footage)
1. Go to https://www.pexels.com/api/
2. Create free account
3. Get your API key from the API section

**Cost:** FREE (200 requests/hour)

## Setup Instructions

### 1. Install Dependencies
All dependencies are already installed. If you need to reinstall:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```bash
OPENAI_API_KEY=sk-your-openai-key-here
PEXELS_API_KEY=your-pexels-key-here
PORT=3000
```

**IMPORTANT:** Replace the placeholder values with your actual API keys!

### 3. Verify Directories
The `temp/` and `output/` directories should already exist. If not:
```bash
mkdir -p temp output
```

## Running the Application

Start the server:
```bash
npm start
```

Open your browser to:
```
http://localhost:3000
```

## Usage

1. Enter a video prompt in the text area
   - Example: "Make a short engaging video on why tennis balls are luminous green"
2. Click "Generate Video"
3. Wait 2-4 minutes (you'll see console logs showing progress)
4. Watch the generated video in the browser!

## What Gets Generated

For a prompt like "Make a short engaging video on why tennis balls are luminous green":

**Output:** A 30-40 second professional video with:
- 5-6 scenes from Pexels stock footage
- AI voiceover narrating the story
- Smooth 0.5s cross-fade transitions
- Burned-in captions
- 1080p resolution @ 30fps

## Project Structure

```
OpusClip/
├── server.js           # Backend with all AI pipeline logic
├── index.html          # Simple web interface
├── package.json        # Dependencies and scripts
├── .env               # API keys (create this!)
├── temp/              # Temporary processing files
└── output/            # Generated videos (MP4)
```

## How It Works

1. **Storyboard Generation** - GPT-4 creates a scene-by-scene breakdown
2. **Asset Gathering** - Pexels API finds matching stock footage
3. **Video Processing** - FFmpeg trims and normalizes each clip
4. **Voiceover Creation** - OpenAI TTS generates professional narration
5. **Final Rendering** - FFmpeg stitches everything with transitions and captions
6. **Cleanup** - Temporary files are removed

## Cost Per Video

- GPT-4 (storyboard): ~$0.35
- TTS (voiceover): ~$0.12
- Pexels: Free
- **Total: ~$0.47 per video**

## Troubleshooting

### FFmpeg Not Found
```
Error: ffmpeg not found
```
**Solution:** Install FFmpeg using the instructions above and restart the server.

### OpenAI API Error
```
Error: Incorrect API key provided
```
**Solution:** Check your `.env` file and make sure `OPENAI_API_KEY` is set correctly.

### Pexels No Results
```
Error: No videos found
```
**Solution:** The system automatically falls back to generic footage. If it still fails, check your Pexels API key.

### Port Already in Use
```
Error: Port 3000 already in use
```
**Solution:** Change the `PORT` in `.env` to a different number (e.g., 3001).

## Tech Stack

- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4 + TTS
- **Stock Footage:** Pexels API
- **Video Processing:** FFmpeg with xfade transitions
- **Frontend:** Vanilla HTML/CSS/JavaScript

## Limitations (MVP)

- Single video generation at a time (no queue)
- No user authentication
- No video history/persistence
- Basic transitions only (cross-fade)
- Temp files require manual cleanup if errors occur

## Future Enhancements

- Background music integration
- Multiple transition styles
- Different aspect ratios (9:16 for TikTok)
- User accounts and video gallery
- Progress bar in UI
- Batch processing
- Direct social media publishing

## License

ISC

## Support

For issues or questions, check the console logs for detailed error messages.

