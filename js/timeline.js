// ============================================================
// Timeline sequencer
// ============================================================
let keyframes = []; // {t, effect, brightness}
let tlPlaying = false;
let tlStartTime = null;
let tlTimer = null;

function getDuration() { return parseFloat(document.getElementById('tlDuration').value) || 30; }

function addKeyframe(e) {
  if (tlPlaying) return;
  const track = document.getElementById('timelineTrack');
  const rect = track.getBoundingClientRect();
  const t = ((e.clientX - rect.left) / rect.width) * getDuration();
  keyframes.push({ t: Math.max(0, t), effect: currentEffect, brightness: currentBrightness });
  keyframes.sort((a,b) => a.t - b.t);
  renderKeyframes();
}

function renderKeyframes() {
  const tlTrack = document.getElementById('timelineTrack');
  const tlTimeDisplay = document.getElementById('tlTimeDisplay');
  // Clear existing keyframe els
  tlTrack.querySelectorAll('.timeline-keyframe').forEach(e => e.remove());
  const dur = getDuration();
  keyframes.forEach((kf, i) => {
    const el = document.createElement('div');
    el.className = 'timeline-keyframe';
    el.style.left = `${(kf.t / dur) * 100}%`;
    const eff = EFFECTS.find(e => e.id === kf.effect);
    el.style.background = eff ? (eff.color.startsWith('linear') ? '#667eea' : eff.color) : '#888';
    el.title = `${kf.t.toFixed(1)}s — ${eff ? eff.name : 'mode ' + kf.effect}`;
    el.onclick = (ev) => { ev.stopPropagation(); keyframes.splice(i, 1); renderKeyframes(); };
    tlTrack.appendChild(el);
  });
  document.getElementById('keyframeList').textContent =
    keyframes.length === 0 ? 'Click track to add keyframes. Click a keyframe to remove it.'
    : keyframes.map(kf => {
        const eff = EFFECTS.find(e => e.id === kf.effect);
        return `${kf.t.toFixed(1)}s:${eff ? eff.name : '?'}(${kf.brightness})`;
      }).join('  •  ');
}

async function togglePlayback() {
  if (tlPlaying) {
    stopPlayback();
  } else {
    await startPlayback();
  }
}

async function startPlayback() {
  if (keyframes.length === 0) { log('No keyframes', 'info'); return; }
  const tlPlayBtn = document.getElementById('tlPlayBtn');
  tlPlaying = true;
  tlPlayBtn.textContent = '⏹ Stop';
  tlStartTime = performance.now();
  const dur = getDuration() * 1000;
  let kfIdx = 0;

  function tick() {
    if (!tlPlaying) return;
    const elapsed = performance.now() - tlStartTime;
    const t = (elapsed / 1000);
    const pct = Math.min(1, elapsed / dur);
    const tlCursor = document.getElementById('tlCursor');
    const tlTimeDisplay = document.getElementById('tlTimeDisplay');

    tlCursor.style.left = `${pct * 100}%`;
    tlTimeDisplay.textContent = `${t.toFixed(1)}s / ${getDuration()}s`;

    // Play keyframes
    while (kfIdx < keyframes.length && keyframes[kfIdx].t * 1000 <= elapsed) {
      const kf = keyframes[kfIdx];
      setEffect(kf.effect);
      sendPacket(0x13, [kf.brightness]);
      kfIdx++;
    }

    if (elapsed >= dur) {
      stopPlayback();
      return;
    }
    tlTimer = requestAnimationFrame(tick);
  }
  tlTimer = requestAnimationFrame(tick);
}

function stopPlayback() {
  const tlPlayBtn = document.getElementById('tlPlayBtn');
  tlPlaying = false;
  if (tlTimer) cancelAnimationFrame(tlTimer);
  tlPlayBtn.textContent = '▶ Play';
}

function clearTimeline() {
  stopPlayback();
  keyframes = [];
  const tlCursor = document.getElementById('tlCursor');
  const tlTimeDisplay = document.getElementById('tlTimeDisplay');
  tlCursor.style.left = '0';
  tlTimeDisplay.textContent = `0.0s / ${getDuration()}s`;
  renderKeyframes();
}
