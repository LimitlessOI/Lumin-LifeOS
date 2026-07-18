/**
 * SYNOPSIS: SocialMediaOS Film Studio — camera take (prompter never burned in), speech-synced teleprompter, director checks.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
(function (global) {
  'use strict';

  const DIRECTOR_BY_MODE = {
    teleprompter: {
      sound: 'Mic within 12–18 inches. Room quiet — HVAC and fridge hum kill trust. Do a 3-second clap test; if meter barely moves when you whisper, too far.',
      background: 'Plain wall or soft blur behind you. No bright window behind your head. Teleprompter is on-screen for YOU only — it never goes into the take.',
      broll: [
        'Neighborhood drive-by that matches the beat you just said',
        'Close-up of a key number or document (no private data)',
        'Door / key / skyline insert for the CTA beat',
      ],
    },
    bullets: {
      sound: 'Stand farther from walls to cut echo. Speak at conversation volume — bullets die if you boom.',
      background: 'Sit where your eyes naturally go between thoughts. Busy kitchens read as “amateur livestream.”',
      broll: [
        'Cutaways of each bullet’s real-world proof',
        'Screen share / map / list only for 2–3 seconds',
        'Reaction shot of the place you just named',
      ],
    },
    bookends: {
      sound: 'Lock hook + exit at same mic distance so volume matches. Middle freestyle can drift — watch the meter.',
      background: 'Same frame for open and close so the edit stitches clean.',
      broll: [
        'Cold open visual that sells the hook without your face',
        'Middle: one lived location that proves the freestyle',
        'End card / soft CTA environment for the exit line',
      ],
    },
    'read&riff': {
      sound: 'Read soft, then lift energy on the riff — don’t stay at “audiobook.”',
      background: 'Keep the frame still while you switch from script to story so the cut feels intentional.',
      broll: [
        'During riff: the place or person in the story',
        'Hands / object that makes the scar concrete',
        'Avoid filming the phone screen with the script on it',
      ],
    },
    story: {
      sound: 'Story mode needs silence under you — pause longer than feels natural.',
      background: 'Intimate framing (chest-up). Background should not compete with the story.',
      broll: [
        'The setting of the story (street, house exterior, office door)',
        'Detail inserts that match verbs you used',
        'One “then vs now” pair if the arc needs proof',
      ],
    },
    'hot-seat': {
      sound: 'Answer pace varies — ride gain carefully; don’t yell into hot takes.',
      background: 'Look like a real conversation: slight off-center, not a TED stage.',
      broll: [
        'Question card as text overlay later — don’t film it now',
        'Proof clips for each blunt answer',
        'Listener POV cutaways if you have a second phone',
      ],
    },
    analytics: {
      sound: 'You’re teaching retention — crisp consonants matter more than volume.',
      background: 'Clean desk / chart corner. Avoid selfie-bathroom vibes.',
      broll: [
        'Analytics screenshot (blur personal IDs)',
        'Before/after thumbnail or title card',
        'Timeline graphic of the retention beat you name',
      ],
    },
    shorts: {
      sound: 'Assume phone speaker playback — punch words in the first 2 seconds.',
      background: 'Vertical 9:16. Eyes in upper third. Busy backgrounds kill mobile watch time.',
      broll: [
        'One jump-cut insert per 8–10 seconds',
        'Text-safe headroom — leave space for captions later',
        'Pattern interrupt: location change or prop once',
      ],
    },
  };

  function normalizeWords(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function overlapScore(aWords, bWords) {
    if (!aWords.length || !bWords.length) return 0;
    const set = new Set(aWords);
    let hit = 0;
    for (const w of bWords) if (set.has(w)) hit += 1;
    return hit / Math.max(bWords.length, 1);
  }

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    if (!global.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
  }

  function directorFor(mode) {
    const key = String(mode || 'teleprompter').toLowerCase();
    return DIRECTOR_BY_MODE[key] || DIRECTOR_BY_MODE.teleprompter;
  }

  function createFilmStudio(opts) {
    const root = opts.root;
    const getLines = opts.getLines || (() => []);
    const getLineIndex = opts.getLineIndex || (() => 0);
    const setLine = opts.setLine || (() => {});
    const getFilmMode = opts.getFilmMode || (() => 'teleprompter');
    const onTranscript = opts.onTranscript || (() => {});
    const onStatus = opts.onStatus || (() => {});
    const onSoundsLikeReading = opts.onSoundsLikeReading || (() => {});
    const uploadTake = opts.uploadTake || null;

    const els = {
      video: root.querySelector('[data-fs="video"]'),
      meter: root.querySelector('[data-fs="meter"]'),
      meterLabel: root.querySelector('[data-fs="meter-label"]'),
      lightLabel: root.querySelector('[data-fs="light-label"]'),
      soundTip: root.querySelector('[data-fs="sound-tip"]'),
      bgTip: root.querySelector('[data-fs="bg-tip"]'),
      brollList: root.querySelector('[data-fs="broll-list"]'),
      status: root.querySelector('[data-fs="status"]'),
      recBtn: root.querySelector('[data-fs="rec"]'),
      stopBtn: root.querySelector('[data-fs="stop"]'),
      armBtn: root.querySelector('[data-fs="arm"]'),
      syncBtn: root.querySelector('[data-fs="sync"]'),
      downloadBtn: root.querySelector('[data-fs="download"]'),
      uploadBtn: root.querySelector('[data-fs="upload"]'),
      recDot: root.querySelector('[data-fs="rec-dot"]'),
      cleanNote: root.querySelector('[data-fs="clean-note"]'),
    };

    let stream = null;
    let recorder = null;
    let chunks = [];
    let lastBlob = null;
    let audioCtx = null;
    let analyser = null;
    let meterRaf = 0;
    let recognition = null;
    let syncOn = false;
    let rollingHeard = '';
    let verbatimStreak = 0;
    let recording = false;

    function setStatus(text, kind) {
      if (els.status) {
        els.status.textContent = text;
        els.status.dataset.kind = kind || '';
      }
      onStatus(text, kind);
    }

    function refreshDirector() {
      const d = directorFor(getFilmMode());
      if (els.soundTip) els.soundTip.textContent = d.sound;
      if (els.bgTip) els.bgTip.textContent = d.background;
      if (els.brollList) {
        els.brollList.innerHTML = '';
        d.broll.forEach((tip) => {
          const li = document.createElement('li');
          li.textContent = tip;
          els.brollList.appendChild(li);
        });
      }
    }

    function stopMeter() {
      if (meterRaf) cancelAnimationFrame(meterRaf);
      meterRaf = 0;
    }

    function startMeter() {
      stopMeter();
      if (!stream || !els.meter) return;
      try {
        audioCtx = audioCtx || new (global.AudioContext || global.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        src.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const pct = Math.min(100, Math.round(rms * 280));
          els.meter.style.width = pct + '%';
          els.meter.dataset.level = pct < 8 ? 'low' : pct > 72 ? 'hot' : 'ok';
          if (els.meterLabel) {
            if (pct < 8) els.meterLabel.textContent = 'Too quiet — move closer or speak up';
            else if (pct > 72) els.meterLabel.textContent = 'Hot — back off a few inches';
            else els.meterLabel.textContent = 'Sound level OK';
          }
          meterRaf = requestAnimationFrame(tick);
        };
        tick();
      } catch (_) {
        if (els.meterLabel) els.meterLabel.textContent = 'Meter unavailable on this device';
      }
    }

    function sampleLight() {
      if (!els.video || !els.lightLabel) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(els.video, 0, 0, 64, 64);
        const img = ctx.getImageData(0, 0, 64, 64).data;
        let sum = 0;
        for (let i = 0; i < img.length; i += 4) {
          sum += 0.2126 * img[i] + 0.7152 * img[i + 1] + 0.0722 * img[i + 2];
        }
        const avg = sum / (img.length / 4);
        if (avg < 55) els.lightLabel.textContent = 'Dark — face a window or lamp (light in front of you)';
        else if (avg > 210) els.lightLabel.textContent = 'Blown out — turn away from bright backlight';
        else els.lightLabel.textContent = 'Light looks usable';
      } catch (_) {
        els.lightLabel.textContent = 'Light check needs camera preview';
      }
    }

    async function armCamera() {
      refreshDirector();
      if (stream) return stream;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera/mic not available in this browser. Use Chrome/Safari on phone or desktop.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 9 / 16 },
        },
      });
      if (els.video) {
        els.video.srcObject = stream;
        els.video.muted = true;
        els.video.setAttribute('playsinline', 'true');
        await els.video.play().catch(() => {});
      }
      startMeter();
      setTimeout(sampleLight, 600);
      setInterval(sampleLight, 2500);
      setStatus('Camera armed. Teleprompter stays on the page — never in the recording.', 'ok');
      return stream;
    }

    function advanceFromSpeech(heardChunk) {
      rollingHeard = (rollingHeard + ' ' + heardChunk).trim().slice(-500);
      const lines = getLines();
      const idx = getLineIndex();
      if (!lines.length) return;
      const heard = normalizeWords(rollingHeard);
      const cur = normalizeWords(lines[idx] || '');
      const next = normalizeWords(lines[idx + 1] || '');
      const curScore = overlapScore(heard.slice(-Math.max(cur.length, 6)), cur);
      const nextScore = next.length ? overlapScore(heard.slice(-Math.max(next.length, 6)), next) : 0;

      if (curScore >= 0.72) verbatimStreak += 1;
      else if (curScore < 0.35) verbatimStreak = Math.max(0, verbatimStreak - 1);

      if (verbatimStreak >= 3) {
        verbatimStreak = 0;
        onSoundsLikeReading({
          lineIndex: idx,
          hint: 'You’re tracking the script word-for-word — freestyle this beat so it doesn’t sound read.',
        });
      }

      if (nextScore >= 0.55 && nextScore > curScore + 0.08) {
        setLine(idx + 1, { force: true });
        rollingHeard = heardChunk;
        return;
      }
      if (curScore >= 0.68 && idx < lines.length - 1) {
        setLine(idx + 1, { force: true });
        rollingHeard = '';
      }
    }

    function stopSync() {
      syncOn = false;
      if (recognition) {
        try { recognition.onend = null; recognition.stop(); } catch (_) {}
        recognition = null;
      }
      if (els.syncBtn) els.syncBtn.textContent = 'Sync teleprompter to voice';
    }

    function startSync() {
      const Ctor = global.SpeechRecognition || global.webkitSpeechRecognition;
      if (!Ctor) {
        setStatus('Voice sync needs Safari/Chrome speech recognition. Use Next line manually.', 'warn');
        return;
      }
      stopSync();
      syncOn = true;
      recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let chunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          chunk += event.results[i][0].transcript + ' ';
        }
        const finalish = event.results[event.results.length - 1];
        if (finalish && finalish.isFinal) {
          onTranscript(chunk.trim(), { final: true });
        }
        advanceFromSpeech(chunk);
      };
      recognition.onerror = () => {
        if (syncOn) setStatus('Voice sync hiccup — still recording clean camera take.', 'warn');
      };
      recognition.onend = () => {
        if (syncOn) {
          try { recognition.start(); } catch (_) {}
        }
      };
      try {
        recognition.start();
        if (els.syncBtn) els.syncBtn.textContent = 'Stop voice sync';
        setStatus('Teleprompter will advance as you talk. Script stays off-camera.', 'ok');
      } catch (err) {
        setStatus('Could not start voice sync: ' + (err && err.message), 'error');
      }
    }

    function toggleSync() {
      if (syncOn) stopSync();
      else startSync();
    }

    async function startRecording() {
      await armCamera();
      chunks = [];
      lastBlob = null;
      const mime = pickMimeType();
      const options = mime ? { mimeType: mime, videoBitsPerSecond: 2500000 } : undefined;
      recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        lastBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        recording = false;
        if (els.recDot) els.recDot.hidden = true;
        if (els.downloadBtn) els.downloadBtn.disabled = false;
        if (els.uploadBtn) els.uploadBtn.disabled = false;
        setStatus('Take saved on this device. Teleprompter was never in the file — Descript-style clean camera.', 'ok');
      };
      recorder.start(1000);
      recording = true;
      if (els.recDot) els.recDot.hidden = false;
      if (!syncOn) startSync();
      setStatus('RECORDING — only the camera stream is captured. Look at the lens, glance at the prompter.', 'rec');
    }

    function stopRecording() {
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      else setStatus('Not recording.', 'warn');
    }

    function downloadTake() {
      if (!lastBlob) return;
      const a = document.createElement('a');
      const ext = (lastBlob.type || '').includes('mp4') ? 'mp4' : 'webm';
      a.href = URL.createObjectURL(lastBlob);
      a.download = 'smos-take-' + Date.now() + '.' + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    async function uploadLastTake() {
      if (!lastBlob) throw new Error('No take yet');
      if (typeof uploadTake !== 'function') throw new Error('Upload not wired');
      setStatus('Uploading take…', 'ok');
      const result = await uploadTake(lastBlob);
      setStatus('Uploaded. ' + (result && result.publicUrl ? result.publicUrl : 'Ready for Creative Engine edit.'), 'ok');
      return result;
    }

    function destroy() {
      stopSync();
      stopMeter();
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch (_) {}
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
        audioCtx = null;
      }
    }

    if (els.armBtn) els.armBtn.addEventListener('click', () => armCamera().catch((e) => setStatus(e.message, 'error')));
    if (els.recBtn) els.recBtn.addEventListener('click', () => startRecording().catch((e) => setStatus(e.message, 'error')));
    if (els.stopBtn) els.stopBtn.addEventListener('click', () => stopRecording());
    if (els.syncBtn) els.syncBtn.addEventListener('click', () => toggleSync());
    if (els.downloadBtn) {
      els.downloadBtn.disabled = true;
      els.downloadBtn.addEventListener('click', () => downloadTake());
    }
    if (els.uploadBtn) {
      els.uploadBtn.disabled = true;
      els.uploadBtn.addEventListener('click', () => uploadLastTake().catch((e) => setStatus(e.message, 'error')));
    }
    if (els.cleanNote) {
      els.cleanNote.textContent =
        'Descript-style rule: the teleprompter is UI only. We record the camera stream — script text never appears in the video file.';
    }

    refreshDirector();

    return {
      armCamera,
      startRecording,
      stopRecording,
      toggleSync,
      refreshDirector,
      downloadTake,
      uploadLastTake,
      destroy,
      getLastBlob: () => lastBlob,
      isRecording: () => recording,
    };
  }

  function filmStudioMarkup() {
    return [
      '<section class="film-studio" id="filmStudio" aria-label="Film studio">',
      '  <div class="film-head">',
      '    <h2>Film studio</h2>',
      '    <p class="film-sub">Phone or desktop. Camera records a clean take — teleprompter scrolls with your voice and never burns into the video.</p>',
      '  </div>',
      '  <div class="film-grid">',
      '    <div class="film-stage">',
      '      <span class="rec-dot" data-fs="rec-dot" hidden></span>',
      '      <video data-fs="video" playsinline muted autoplay></video>',
      '      <div class="film-meters">',
      '        <div class="meter-track"><div class="meter-fill" data-fs="meter"></div></div>',
      '        <div class="meter-label" data-fs="meter-label">Arm camera to check sound</div>',
      '        <div class="meter-label" data-fs="light-label">Light check waits for preview</div>',
      '      </div>',
      '    </div>',
      '    <div class="film-director">',
      '      <div class="dir-block"><strong>Sound</strong><p data-fs="sound-tip">—</p></div>',
      '      <div class="dir-block"><strong>Background</strong><p data-fs="bg-tip">—</p></div>',
      '      <div class="dir-block"><strong>B-roll for this video type</strong><ul data-fs="broll-list"></ul></div>',
      '      <p class="clean-note" data-fs="clean-note"></p>',
      '      <div class="film-actions">',
      '        <button type="button" class="secondary" data-fs="arm">Arm camera + mic</button>',
      '        <button type="button" data-fs="rec">Record take</button>',
      '        <button type="button" class="secondary" data-fs="stop">Stop</button>',
      '        <button type="button" class="secondary" data-fs="sync">Sync teleprompter to voice</button>',
      '        <button type="button" class="secondary" data-fs="download">Download take</button>',
      '        <button type="button" class="secondary" data-fs="upload">Upload to Creative Engine</button>',
      '      </div>',
      '      <div class="film-status" data-fs="status">Ready when you are.</div>',
      '    </div>',
      '  </div>',
      '</section>',
    ].join('\n');
  }

  global.SmosFilmStudio = {
    create: createFilmStudio,
    markup: filmStudioMarkup,
    directorFor,
  };
})(typeof window !== 'undefined' ? window : globalThis);
