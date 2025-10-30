// Load .env only in development (Railway injects vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const session = require('express-session');
const OpenAI = require('openai');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// Configure FFmpeg path using bundled binary
console.log('✅ Using bundled FFmpeg at:', ffmpegStatic);
ffmpeg.setFfmpegPath(ffmpegStatic);

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY is not set!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => !k.includes('PATH')));
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Ensure directories exist
['temp', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// ============================================
// 1. GENERATE STORYBOARD (GPT-4)
// ============================================
async function generateStoryboard(prompt) {
  console.log('📝 Generating storyboard with GPT-4...');
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{
      role: "user",
      content: `Create a storyboard for a 30-40 second video about: "${prompt}"

Break it into 5-6 scenes. Each scene needs:
- Duration: 5-7 seconds
- Narration: Natural spoken text for voiceover (conversational, engaging)
- Keywords: Simple search terms for stock footage on Pexels

IMPORTANT: 
- Write narration as if speaking to viewer (natural, conversational)
- Use simple, common visual concepts that exist in stock video
- Make it engaging and informative

Return ONLY valid JSON:
{
  "title": "Video Title",
  "scenes": [
    {
      "duration": 6,
      "narration": "Natural spoken text here",
      "keywords": "simple search term"
    }
  ]
}`
    }],
    response_format: { type: "json_object" }
  });
  
  const storyboard = JSON.parse(completion.choices[0].message.content);
  console.log(`✅ Generated ${storyboard.scenes.length} scenes`);
  return storyboard;
}

// ============================================
// 2. DOWNLOAD CLIPS FROM PEXELS
// ============================================
async function downloadClip(keywords, sceneId) {
  console.log(`  🔍 Searching: "${keywords}"`);
  
  try {
    const searchUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(keywords)}&per_page=15&orientation=landscape`;
    const response = await axios.get(searchUrl, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      timeout: 10000
    });
    
    if (!response.data.videos || response.data.videos.length === 0) {
      throw new Error(`No videos found for "${keywords}"`);
    }
    
    const video = response.data.videos[0];
    let videoFile = video.video_files.find(f => f.quality === 'hd' && f.width === 1920);
    if (!videoFile) videoFile = video.video_files.find(f => f.quality === 'hd');
    if (!videoFile) videoFile = video.video_files[0];
    
    const outputPath = path.join('temp', `scene-${sceneId}-raw.mp4`);
    const writer = fs.createWriteStream(outputPath);
    
    const videoResponse = await axios.get(videoFile.link, {
      responseType: 'stream',
      timeout: 30000
    });
    
    videoResponse.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    console.log(`  ✅ Downloaded scene ${sceneId}`);
    return outputPath;
    
  } catch (error) {
    console.error(`  ⚠️ Error: ${error.message}`);
    if (!keywords.includes('abstract')) {
      console.log(`  🔄 Trying fallback...`);
      return downloadClip('abstract colorful motion', sceneId);
    }
    throw error;
  }
}

// ============================================
// 3. PROCESS CLIPS (Trim & Normalize)
// ============================================
async function processClip(inputPath, duration, sceneId) {
  console.log(`  ⚙️ Processing scene ${sceneId}...`);
  
  const outputPath = path.join('temp', `scene-${sceneId}-final.mp4`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setDuration(duration)
      .size('1920x1080')
      .fps(30)
      .videoCodec('libx264')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`  ✅ Processed scene ${sceneId}`);
        resolve(outputPath);
      })
      .on('error', reject)
      .run();
  });
}

// ============================================
// 4. GENERATE VOICEOVER (OpenAI TTS)
// ============================================
async function generateVoiceover(scenes) {
  console.log('🎤 Generating voiceover with OpenAI TTS...');
  
  const fullScript = scenes.map(s => s.narration).join(' ');
  const mp3Path = path.join('temp', 'voiceover.mp3');
  
  const mp3Response = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: "onyx",  // Options: alloy, echo, fable, onyx, nova, shimmer
    input: fullScript,
    speed: 1.0
  });
  
  const buffer = Buffer.from(await mp3Response.arrayBuffer());
  fs.writeFileSync(mp3Path, buffer);
  
  console.log('✅ Voiceover generated');
  return mp3Path;
}

// ============================================
// 5. CREATE SUBTITLES (Optional Captions)
// ============================================
function createSubtitles(scenes) {
  let srtContent = '';
  let currentTime = 0;
  
  scenes.forEach((scene, index) => {
    const startTime = currentTime;
    const endTime = currentTime + scene.duration;
    
    const formatTime = (seconds) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    
    const cleanText = scene.narration
      .replace(/['"]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
    
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    srtContent += `${cleanText}\n\n`;
    
    currentTime = endTime;
  });
  
  const srtPath = path.join(__dirname, 'temp', 'subtitles.srt');
  fs.writeFileSync(srtPath, srtContent);
  console.log('✅ Subtitles created at:', srtPath);
  console.log('📄 Subtitle content preview:', srtContent.substring(0, 200));
  return srtPath;
}

// ============================================
// 6. RENDER VIDEO (With Transitions & Voiceover)
// ============================================
async function renderVideo(clipPaths, scenes, voiceoverPath, outputPath) {
  console.log('🎬 Rendering final video with transitions...');
  
  const subtitlePath = createSubtitles(scenes);
  
  // Verify subtitle file exists
  if (!fs.existsSync(subtitlePath)) {
    console.error('❌ Subtitle file not found at:', subtitlePath);
    throw new Error('Subtitle file creation failed');
  }
  
  console.log('✅ Subtitle file verified at:', subtitlePath);
  
  // Escape path for FFmpeg - replace backslashes with forward slashes
  const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
  console.log('🔧 Escaped subtitle path for FFmpeg:', escapedSubPath);
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    
    // Add all video clips
    clipPaths.forEach(clip => command.input(clip));
    
    // Add voiceover
    command.input(voiceoverPath);
    
    // Build filter for smooth transitions
    let filterComplex = '';
    const fade = 0.5; // 0.5 second cross-fade
    
    if (clipPaths.length === 1) {
      // Single clip - just add subtitles (with escaped path)
      filterComplex = `[0:v]subtitles='${escapedSubPath}':force_style='FontName=Arial,FontSize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'[v]`;
    } else {
      // Multiple clips - add xfade transitions
      let offset = 0;
      
      for (let i = 0; i < clipPaths.length - 1; i++) {
        if (i === 0) {
          offset = scenes[i].duration - fade;
          filterComplex = `[0:v][1:v]xfade=transition=fade:duration=${fade}:offset=${offset}[v01];`;
        } else {
          offset += scenes[i].duration - fade;
          const prev = i === 1 ? 'v01' : `v0${i}`;
          const curr = `v0${i + 1}`;
          filterComplex += `[${prev}][${i + 1}:v]xfade=transition=fade:duration=${fade}:offset=${offset}[${curr}];`;
        }
      }
      
      // Add subtitles (with escaped path)
      const lastLabel = clipPaths.length === 2 ? 'v01' : `v0${clipPaths.length - 1}`;
      filterComplex += `[${lastLabel}]subtitles='${escapedSubPath}':force_style='FontName=Arial,FontSize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'[v]`;
    }
    
    // Calculate actual video duration (accounting for transition overlaps)
    const sumOfDurations = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    const numTransitions = clipPaths.length - 1;
    const actualVideoDuration = sumOfDurations - (numTransitions * fade);
    
    console.log(`📊 Video timing: ${sumOfDurations}s total - ${numTransitions * fade}s transitions = ${actualVideoDuration}s actual`);
    
    // Add audio padding and trim to exactly match video duration
    // apad adds silence, atrim cuts to exact length
    const audioFilter = `[${clipPaths.length}:a]apad=whole_dur=${actualVideoDuration},atrim=0:${actualVideoDuration},asetpts=PTS-STARTPTS[audio]`;
    
    console.log(`🔊 Audio: Padding to ${actualVideoDuration}s and trimming`);
    
    command
      .complexFilter([filterComplex, audioFilter])
      .outputOptions([
        '-map [v]',
        '-map [audio]',
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        '-shortest' // Stop when shortest stream ends (they should be equal now)
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Video complete!');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        reject(err);
      })
      .on('progress', (p) => {
        if (p.percent) console.log(`  Progress: ${Math.round(p.percent)}%`);
      })
      .run();
  });
}

// ============================================
// 7. MAIN PIPELINE
// ============================================
async function generateVideo(prompt) {
  const videoId = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎬 Starting Video Generation (ID: ${videoId})`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // 1. Generate storyboard
    const storyboard = await generateStoryboard(prompt);
    console.log(`\n📋 Title: "${storyboard.title}"\n`);
    
    // 2. Download clips
    console.log('📥 Downloading clips...');
    const rawPaths = [];
    for (let i = 0; i < storyboard.scenes.length; i++) {
      const clipPath = await downloadClip(storyboard.scenes[i].keywords, i);
      rawPaths.push(clipPath);
    }
    
    // 3. Process clips
    console.log('\n⚙️ Processing clips...');
    const finalPaths = [];
    for (let i = 0; i < rawPaths.length; i++) {
      const processedPath = await processClip(rawPaths[i], storyboard.scenes[i].duration, i);
      finalPaths.push(processedPath);
    }
    
    // 4. Generate voiceover
    const voicePath = await generateVoiceover(storyboard.scenes);
    
    // 5. Render final video
    const outputPath = path.join('output', `${videoId}.mp4`);
    await renderVideo(finalPaths, storyboard.scenes, voicePath, outputPath);
    
    // 6. Cleanup
    console.log('🧹 Cleaning up...');
    const subtitleFile = path.join(__dirname, 'temp', 'subtitles.srt');
    [...rawPaths, ...finalPaths, voicePath, subtitleFile].forEach(file => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ SUCCESS! Video saved: ${outputPath}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return outputPath;
    
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    throw error;
  }
}

// ============================================
// 8. EXPRESS SERVER
// ============================================
const app = express();

// IMPORTANT: Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-video-gen-demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production
    sameSite: 'lax' // Lax for same-site requests (works with redirects)
  },
  proxy: true // Trust the proxy
}));

app.use(express.json());

// Authentication middleware
function requireAuth(req, res, next) {
  console.log('🔒 Auth check:', {
    path: req.path,
    hasSession: !!req.session,
    authenticated: req.session?.authenticated,
    sessionID: req.sessionID
  });
  
  if (req.session && req.session.authenticated) {
    console.log('  ✅ Authenticated, allowing access');
    return next();
  }
  
  console.log('  ❌ Not authenticated, redirecting to login');
  
  // If requesting JSON endpoint, return JSON error
  if (req.path.startsWith('/api') || req.path === '/generate') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Otherwise redirect to login
  res.redirect('/login.html');
}

// Public routes (no authentication required)
app.get('/login.html', (req, res) => {
  // If already authenticated, redirect to home
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.DEMO_PASSWORD || 'demo2024';
  
  console.log('🔐 Login attempt');
  console.log('   Received password length:', password?.length || 0);
  console.log('   Expected password length:', correctPassword.length);
  console.log('   Match:', password === correctPassword);
  
  if (password === correctPassword) {
    req.session.authenticated = true;
    
    // IMPORTANT: Save session before responding
    req.session.save((err) => {
      if (err) {
        console.log('   ❌ Session save error:', err);
        return res.json({ success: false, error: 'Session error' });
      }
      console.log('   ✅ Login successful, session saved');
      res.json({ success: true });
    });
  } else {
    console.log('   ❌ Login failed - incorrect password');
    res.json({ success: false, error: 'Invalid password' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Serve index.html (protected)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Protected static files
app.use('/output', requireAuth, express.static(path.join(__dirname, 'output')));

app.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || prompt.trim().length === 0) {
      return res.json({ error: 'Prompt is required' });
    }
    
    const videoPath = await generateVideo(prompt);
    const videoUrl = '/' + videoPath.replace(/\\/g, '/');
    
    res.json({ videoUrl });
    
  } catch (error) {
    console.error(error);
    res.json({ error: error.message || 'Generation failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 AI Video Generator Ready!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📍 Server: http://localhost:${PORT}`);
  console.log(`\n✅ Environment:`);
  console.log(`   • NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   • OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✓ Set (sk-' + process.env.OPENAI_API_KEY.substring(3, 8) + '...)' : '✗ Missing'}`);
  console.log(`   • PEXELS_API_KEY: ${process.env.PEXELS_API_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   • DEMO_PASSWORD: ${process.env.DEMO_PASSWORD ? '✓ Set' : '✗ Missing (using default)'}`);
  console.log(`   • FFmpeg: Checking...\n`);
});

