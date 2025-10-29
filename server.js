// Load .env only in development (Railway injects vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const session = require('express-session');
const OpenAI = require('openai');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

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
  
  const srtPath = path.join('temp', 'subtitles.srt');
  fs.writeFileSync(srtPath, srtContent);
  console.log('✅ Subtitles created');
  return srtPath;
}

// ============================================
// 6. RENDER VIDEO (With Transitions & Voiceover)
// ============================================
async function renderVideo(clipPaths, scenes, voiceoverPath, outputPath) {
  console.log('🎬 Rendering final video with transitions...');
  
  const subtitlePath = createSubtitles(scenes);
  
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
      // Single clip - just add subtitles
      filterComplex = `[0:v]subtitles=${subtitlePath}:force_style='FontName=Arial,FontSize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'[v]`;
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
      
      // Add subtitles
      const lastLabel = clipPaths.length === 2 ? 'v01' : `v0${clipPaths.length - 1}`;
      filterComplex += `[${lastLabel}]subtitles=${subtitlePath}:force_style='FontName=Arial,FontSize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2,Alignment=2,MarginV=50'[v]`;
    }
    
    // Calculate actual video duration (accounting for transition overlaps)
    const sumOfDurations = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    const numTransitions = clipPaths.length - 1;
    const actualVideoDuration = sumOfDurations - (numTransitions * fade);
    
    console.log(`📊 Video timing: ${sumOfDurations}s total - ${numTransitions * fade}s transitions = ${actualVideoDuration}s actual`);
    
    // Add audio padding to match actual video duration
    const audioFilter = `[${clipPaths.length}:a]apad=whole_dur=${actualVideoDuration}[audio]`;
    
    command
      .complexFilter([filterComplex, audioFilter])
      .outputOptions([
        '-map [v]',
        '-map [audio]', // Use padded audio
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 192k',
        '-pix_fmt yuv420p',
        `-t ${actualVideoDuration}` // Set output duration to match actual video length with transitions
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('✅ Video complete!');
        resolve(outputPath);
      })
      .on('error', reject)
      .on('progress', (p) => {
        if (p.percent) console.log(`  ${Math.round(p.percent)}%`);
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
    [...rawPaths, ...finalPaths, voicePath].forEach(file => {
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'ai-video-gen-demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
  }
}));

app.use(express.json());

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  
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
    console.log('   ✅ Login successful');
    res.json({ success: true });
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

