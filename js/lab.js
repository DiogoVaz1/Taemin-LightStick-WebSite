// ============================================================
// lab.js - Lightstick Lab (test bench)
//
// Fire every colour / brightness / effect / raw packet at any
// subset of the connected lightsticks, to compare models (V1 vs V2).
//
// Reads the BLE state owned by ble.js (device, gatt, rxChar,
// _extraDevices) but writes through its OWN per-device queue, so
// two lightsticks never overlap GATT writes. Nothing here changes
// how the rest of the site talks to the lightsticks.
// ============================================================

const LAB_NOTES_KEY = 'lsw-lab-notes';

let _labSelected  = new Set();  // ids of devices that receive commands
let _labKnown     = new Set();  // ids already seen (new ones get auto-selected)
let _labPoll      = null;       // interval refreshing the device list
let _labColor     = null;       // colour mode last sent (null = none yet)
let _labBright    = 8;          // brightness last chosen (0-10)
let _labAutoTimer = null;       // colour auto-step interval
let _labFx        = null;       // running software effect
let _labQueues    = {};         // per-device write chain
let _labPending   = {};         // per-device writes waiting in the chain
let _labBuilt     = false;

// ── Devices ─────────────────────────────────────────────────
// Connected lightsticks, primary first. Shape: { id, name, rx }
function _labDeviceList() {
  const list = [];
  try {
    if (typeof device !== 'undefined' && device && gatt && gatt.connected && rxChar) {
      list.push({ id: 'p:' + (device.id || device.name || 'primary'), name: device.name || 'Lightstick', rx: rxChar });
    }
    if (typeof _extraDevices !== 'undefined') {
      _extraDevices.forEach(ed => {
        if (ed.gatt && ed.gatt.connected && ed.rxChar) {
          list.push({ id: 'x:' + (ed.device.id || ed.device.name), name: ed.device.name || 'Lightstick', rx: ed.rxChar });
        }
      });
    }
  } catch (e) { /* BLE state not ready yet */ }
  return list;
}

function _labModel(name) { return /v\s*2/i.test(name || '') ? 'V2' : 'V1'; }

function _labTargets() { return _labDeviceList().filter(d => _labSelected.has(d.id)); }

function labRenderDevices() {
  const box = document.getElementById('labDevices');
  if (!box) return;

  if (!navigator.bluetooth) {
    box.dataset.sig = '';
    box.innerHTML = '<div class="lab-warn">This browser has no Web Bluetooth. Open the site in Chrome or Edge.</div>';
    return;
  }

  const devs = _labDeviceList();
  const ids  = new Set(devs.map(d => d.id));
  devs.forEach(d => { if (!_labKnown.has(d.id)) { _labKnown.add(d.id); _labSelected.add(d.id); } });
  [..._labSelected].forEach(id => { if (!ids.has(id)) _labSelected.delete(id); });
  [..._labKnown].forEach(id => { if (!ids.has(id)) _labKnown.delete(id); });

  const sig = devs.map(d => d.id + ':' + (_labSelected.has(d.id) ? 1 : 0)).join('|') || 'none';
  if (box.dataset.sig === sig) return;   // nothing changed, don't rebuild every second
  box.dataset.sig = sig;

  if (!devs.length) {
    box.innerHTML = '<div class="lab-empty">No lightstick connected. Use ⚡ Lightstick Manager to pair one or two.</div>';
    return;
  }
  box.innerHTML = devs.map(d => {
    const on = _labSelected.has(d.id);
    return `<label class="lab-device${on ? ' on' : ''}">
      <input type="checkbox" ${on ? 'checked' : ''} data-id="${escapeHtml(d.id)}" onchange="labToggleDevice(this.dataset.id, this.checked)">
      <span class="lab-device-name">${escapeHtml(d.name)}</span>
      <span class="lab-model">${_labModel(d.name)}</span>
    </label>`;
  }).join('');
}

function labToggleDevice(id, on) {
  if (on) _labSelected.add(id); else _labSelected.delete(id);
  const box = document.getElementById('labDevices');
  if (box) box.dataset.sig = '';
  labRenderDevices();
}

function labSelectAll(on) {
  _labDeviceList().forEach(d => { if (on) _labSelected.add(d.id); else _labSelected.delete(d.id); });
  const box = document.getElementById('labDevices');
  if (box) box.dataset.sig = '';
  labRenderDevices();
}

// ── Sending ─────────────────────────────────────────────────
// One queue per device: writes to the same lightstick never overlap
// (Chrome rejects overlapping GATT operations), and two lightsticks
// are written in parallel.
function _labWrite(dev, pkt, droppable) {
  const id = dev.id;
  if (droppable && (_labPending[id] || 0) > 4) return Promise.resolve(); // effect tick: skip if backed up
  _labPending[id] = (_labPending[id] || 0) + 1;
  const run = async () => {
    try { await dev.rx.writeValueWithoutResponse(pkt); }
    catch (e) {
      try { await dev.rx.writeValue(pkt); }
      catch (e2) { _labLog(`✗ ${dev.name}: ${e2.message}`, 'err'); }
    } finally { _labPending[id]--; }
  };
  _labQueues[id] = (_labQueues[id] || Promise.resolve()).then(run);
  return _labQueues[id];
}

function _labHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function _labSendBytes(bytes, label, droppable) {
  const targets = _labTargets();
  if (!targets.length) {
    if (!droppable) _labLog('No lightstick selected - connect one and tick it under "Send to".', 'err');
    return Promise.resolve();
  }
  const pkt = new Uint8Array(bytes);
  if (!droppable) {
    _labLog(`→ ${targets.map(t => t.name).join(' + ')}   ${_labHex(pkt)}${label ? '   · ' + label : ''}`);
  }
  return Promise.all(targets.map(t => _labWrite(t, pkt, droppable)));
}

function _labSend(cmd, payload, label, droppable) {
  return _labSendBytes(buildPacket(cmd, payload || []), label, droppable);
}

// ── Colours ─────────────────────────────────────────────────
async function labSendColor(id, keepAuto) {
  if (!keepAuto) _labStopAuto();
  labStopFx(false);
  _labColor = id;
  _labHighlight();
  await _labSend(0x15, [id, 0x01], 'colour ' + id);
  await _labSend(0x13, [_labBright], 'brightness ' + _labBright);
}

function labStep(delta, fromAuto) {
  if (!fromAuto) _labStopAuto();
  const n   = (typeof EFFECT_COUNT !== 'undefined') ? EFFECT_COUNT : 28;
  const cur = (_labColor === null) ? (delta > 0 ? -1 : 0) : _labColor;
  labSendColor((cur + delta + n) % n, !!fromAuto);
}

function labToggleAuto() {
  if (_labAutoTimer) { _labStopAuto(); return; }
  labStopFx(false);
  const secs = parseFloat(document.getElementById('labAutoSecs').value) || 2;
  const btn  = document.getElementById('labAutoBtn');
  if (btn) btn.textContent = '⏹ Stop';
  labStep(1, true);   // start immediately
  _labAutoTimer = setInterval(() => labStep(1, true), secs * 1000);
}

function _labStopAuto() {
  if (_labAutoTimer) { clearInterval(_labAutoTimer); _labAutoTimer = null; }
  const btn = document.getElementById('labAutoBtn');
  if (btn) btn.textContent = '▶ Auto-step';
}

function _labHighlight() {
  document.querySelectorAll('.lab-color').forEach(b => b.classList.remove('sel'));
  const now = document.getElementById('labNow');
  if (_labColor !== null) {
    const b = document.getElementById('labC' + _labColor);
    if (b) b.classList.add('sel');
    const e = (typeof EFFECTS !== 'undefined') ? EFFECTS.find(x => x.id === _labColor) : null;
    if (now) {
      now.innerHTML = `<span class="lab-swatch" style="background:${e ? e.color : '#888'}"></span>` +
        `<span>Mode <b>${_labColor}</b> <span class="lab-hex">0x${_labColor.toString(16).padStart(2, '0').toUpperCase()}</span>` +
        `${e ? ' · ' + e.name : ''}</span>`;
    }
  }
  document.querySelectorAll('.lab-b').forEach(b => b.classList.toggle('sel', parseInt(b.dataset.v, 10) === _labBright));
}

// ── Brightness / power ──────────────────────────────────────
function labSetBrightness(v) {
  _labBright = v;
  labStopFx(false);
  _labHighlight();
  _labSend(0x13, [v], 'brightness ' + v);
}

function labLightOff() {
  _labStopAuto();
  labStopFx(false);
  _labSend(0x12, [], 'light off');
}

// ── Software effects (same maths as the Studio's syncTick) ───
function labStartFx(kind) {
  labStopFx(false);
  _labStopAuto();
  if (_labColor === null) { _labColor = 0; _labHighlight(); }
  const base = _labBright > 0 ? _labBright : 10;
  const fx = {
    kind, base, phase: 0, last: -1,
    t0:  performance.now(),
    dur: parseFloat(document.getElementById('labFadeSecs').value) || 3,
    timer: null,
  };
  _labFx = fx;
  _labMarkFx(kind);
  _labSend(0x15, [_labColor, 0x01], kind + ' on colour ' + _labColor);
  const start = (kind === 'fade-in') ? 0 : base;
  fx.last = start;
  _labSend(0x13, [start], 'start brightness ' + start);
  fx.timer = setInterval(() => _labFxTick(fx), 100);
}

function _labFxTick(fx) {
  if (_labFx !== fx) return;
  let b;
  let done = false;
  if (fx.kind === 'flicker') {
    fx.phase++;
    b = (fx.phase % 4 < 2) ? fx.base : 0;                  // 200ms on / 200ms off
  } else if (fx.kind === 'wave') {
    fx.phase++;                                             // 10 ticks = 1s per cycle
    b = Math.max(0, Math.min(10, Math.round((fx.base / 2) * (1 + Math.sin(fx.phase * Math.PI / 5)))));
  } else {
    const p = Math.min(1, ((performance.now() - fx.t0) / 1000) / fx.dur);
    b = Math.round(fx.base * (fx.kind === 'fade-out' ? 1 - p : p));
    done = p >= 1;
  }
  if (b !== fx.last) { fx.last = b; _labSend(0x13, [b], null, true); }
  if (done) labStopFx(false);
}

// restore = true puts the brightness back to the chosen level
function labStopFx(restore) {
  const fx = _labFx;
  if (!fx) return;
  clearInterval(fx.timer);
  _labFx = null;
  _labMarkFx(null);
  if (restore) _labSend(0x13, [_labBright], 'restore brightness ' + _labBright);
}

function _labMarkFx(kind) {
  document.querySelectorAll('.lab-fx-btn').forEach(b => b.classList.toggle('lab-on', b.dataset.fx === kind));
}

// ── Built-in modes + raw ────────────────────────────────────
function labAutoMode(type) {
  _labStopAuto();
  labStopFx(false);
  _labSend(0x14, [type, 0x0F], 'built-in mode 0x' + type.toString(16).padStart(2, '0').toUpperCase());
}

function labAutoModeCustom() {
  const v = parseInt(document.getElementById('labModeType').value, 10);
  if (isNaN(v) || v < 0 || v > 255) { _labLog('Mode must be a number from 0 to 255.', 'err'); return; }
  labAutoMode(v);
}

function labSendRaw() {
  const input = document.getElementById('labRaw');
  const text  = (input.value || '').trim();
  if (!text) return;
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (!tokens.every(t => /^[0-9a-f]{1,2}$/i.test(t))) {
    _labLog('Raw packet must be hex bytes, e.g. FF 15 02 0D 01 FF', 'err');
    return;
  }
  _labStopAuto();
  labStopFx(false);
  _labSendBytes(tokens.map(t => parseInt(t, 16)), 'raw');
}

// ── Notes: what each lightstick really shows ────────────────
function _labNotes() {
  try { return JSON.parse(localStorage.getItem(LAB_NOTES_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}

function _labSaveNote(model, id, val) {
  const n = _labNotes();
  n[model] = n[model] || {};
  if (val) n[model][id] = val; else delete n[model][id];
  try { localStorage.setItem(LAB_NOTES_KEY, JSON.stringify(n)); } catch (e) {}
}

function _labRenderNotes() {
  const body = document.getElementById('labNotesBody');
  if (!body || typeof EFFECTS === 'undefined') return;
  const n = _labNotes();
  body.innerHTML = EFFECTS.map(e => {
    const v1 = (n.V1 && n.V1[e.id]) || '';
    const v2 = (n.V2 && n.V2[e.id]) || '';
    return `<tr>
      <td>${e.id}</td>
      <td><span class="lab-swatch lab-swatch-sm" style="background:${e.color}"></span> ${e.name}</td>
      <td><input class="lab-input" data-model="V1" data-id="${e.id}" value="${escapeHtml(v1)}" aria-label="V1 colour for mode ${e.id}" autocomplete="off"></td>
      <td><input class="lab-input" data-model="V2" data-id="${e.id}" value="${escapeHtml(v2)}" aria-label="V2 colour for mode ${e.id}" autocomplete="off"></td>
    </tr>`;
  }).join('');
}

function labCopyNotes() {
  const expected = {};
  if (typeof EFFECTS !== 'undefined') EFFECTS.forEach(e => { expected[e.id] = e.name; });
  const json = JSON.stringify({ expected, observed: _labNotes() }, null, 2);
  const msg  = document.getElementById('labNotesMsg');
  const done = ok => { if (msg) msg.textContent = ok ? 'Copied to the clipboard.' : 'Could not copy - select the text manually.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(() => done(true), () => done(false));
  } else { done(false); }
}

function labClearNotes() {
  if (!confirm('Delete all notes saved in this browser?')) return;
  try { localStorage.removeItem(LAB_NOTES_KEY); } catch (e) {}
  _labRenderNotes();
  const msg = document.getElementById('labNotesMsg');
  if (msg) msg.textContent = 'Notes cleared.';
}

// ── Log ─────────────────────────────────────────────────────
function _labLog(msg, type) {
  const box = document.getElementById('labLog');
  if (!box) return;
  const line = document.createElement('div');
  line.className = 'lab-log-line' + (type === 'err' ? ' err' : '');
  const d  = new Date();
  const ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':');
  line.textContent = `[${ts}] ${msg}`;
  box.appendChild(line);
  while (box.childNodes.length > 150) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function labClearLog() {
  const box = document.getElementById('labLog');
  if (box) box.innerHTML = '';
}

// ── Build / lifecycle ───────────────────────────────────────
function _labBuild() {
  const grid = document.getElementById('labColors');
  if (grid && typeof EFFECTS !== 'undefined') {
    grid.innerHTML = EFFECTS.map(e =>
      `<button class="lab-color" id="labC${e.id}" onclick="labSendColor(${e.id})" aria-label="Mode ${e.id}, ${e.name}">` +
        `<span class="lab-swatch" style="background:${e.color}"></span>` +
        `<span class="lab-color-id">${e.id}</span>` +
        `<span class="lab-color-name">${e.name}</span>` +
      `</button>`).join('');
  }
  const bright = document.getElementById('labBright');
  if (bright) {
    let html = '';
    for (let v = 0; v <= 10; v++) html += `<button class="lab-b" data-v="${v}" onclick="labSetBrightness(${v})">${v}</button>`;
    bright.innerHTML = html;
  }
  const notes = document.getElementById('labNotesBody');
  if (notes) {
    notes.addEventListener('input', ev => {
      const t = ev.target;
      if (t && t.dataset && t.dataset.model) _labSaveNote(t.dataset.model, t.dataset.id, t.value.trim());
    });
  }
  _labRenderNotes();
  _labBuilt = true;
}

function _labEnter() {
  if (!_labBuilt) _labBuild();
  const box = document.getElementById('labDevices');
  if (box) box.dataset.sig = '';
  labRenderDevices();
  _labHighlight();
  if (_labPoll) clearInterval(_labPoll);
  _labPoll = setInterval(labRenderDevices, 1000);
}

function _labLeave() {
  if (_labPoll) { clearInterval(_labPoll); _labPoll = null; }
  _labStopAuto();
  labStopFx(false);
}
