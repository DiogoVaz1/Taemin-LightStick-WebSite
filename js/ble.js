// ============================================================
// BLE — Nordic UART Service (NUS) constants
// ============================================================
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write
const NUS_TX      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify

// ============================================================
// BLE state
// ============================================================
let device = null, gatt = null, rxChar = null, txChar = null;
let deviceId = null; // [ID_H, ID_L] from 0x21 response
let connecting = false;

// ============================================================
// Packet helpers
// ============================================================
function buildPacket(cmd, payload = []) {
  // SEND format: FF CMD LEN [payload...] FF
  return new Uint8Array([0xFF, cmd, payload.length, ...payload, 0xFF]);
}

function calcChecksum(bytes) {
  // For received packet validation
  let sum = 0;
  for (let i = 1; i < bytes.length - 1; i++) sum += bytes[i];
  return (0x100 - (sum & 0xFF)) & 0xFF;
}

// ============================================================
// BLE write
// ============================================================
async function sendPacket(cmd, payload = []) {
  if (!rxChar) { log('Not connected', 'err'); return; }
  const pkt = buildPacket(cmd, payload);
  const hex = Array.from(pkt).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  log(`→ ${hex}`, 'send');
  try {
    await rxChar.writeValueWithoutResponse(pkt);
  } catch(e) {
    try { await rxChar.writeValue(pkt); } catch(e2) { log(`Write error: ${e2.message}`, 'err'); }
  }
}

// Special: init packet is 6 bytes (FF 18 00 FF 00 00)
async function sendInit() {
  if (!rxChar) return;
  const pkt = new Uint8Array([0xFF, 0x18, 0x00, 0xFF, 0x00, 0x00]);
  log(`→ FF 18 00 FF 00 00  [INIT]`, 'send');
  try { await rxChar.writeValueWithoutResponse(pkt); } catch(e) {
    try { await rxChar.writeValue(pkt); } catch {}
  }
}

// ============================================================
// Lightstick Manager Modal
// ============================================================
function openManager() {
  document.getElementById('managerModal').style.display = 'flex';
  updateManagerUI();
}

function closeManager() {
  document.getElementById('managerModal').style.display = 'none';
}

function onOverlayClick(e) {
  if (e.target === document.getElementById('managerModal')) closeManager();
}

function updateManagerUI() {
  const pairBtn       = document.getElementById('pairBtn');
  const noDevicesMsg  = document.getElementById('noDevicesMsg');
  const connectedDevices = document.getElementById('connectedDevices');
  if (!pairBtn || !noDevicesMsg || !connectedDevices) return; // not on every page

  // Remove existing connected device rows (keep noDevicesMsg)
  connectedDevices.querySelectorAll('.connected-device-row').forEach(el => el.remove());

  if (device && gatt && gatt.connected) {
    noDevicesMsg.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'connected-device-row';
    const battEl = document.getElementById('batteryVal');
    const batt = battEl ? battEl.textContent : '--';
    row.innerHTML = `
      <div class="connected-device-info">
        <div class="connected-dot"></div>
        <span>${device.name || 'TAEMIN LIGHTSTICK'}</span>
        ${batt !== '--' ? `<span style="color:var(--muted);font-size:0.75rem">🔋 ${batt}</span>` : ''}
      </div>
      <button class="btn btn-danger" style="font-size:0.75rem;padding:0.3rem 0.7rem" onclick="doDisconnect()">Disconnect</button>
    `;
    connectedDevices.appendChild(row);
    pairBtn.textContent = '⚡ Pair Another Lightstick';
    pairBtn.disabled = false;
  } else {
    noDevicesMsg.style.display = 'block';
    pairBtn.innerHTML = '⚡ Pair New Lightstick';
    pairBtn.disabled = connecting;
  }
}

async function doPair() {
  closeManager();
  await doConnect();
}

async function toggleConnect() {
  if (device && gatt && gatt.connected) {
    await doDisconnect();
  } else {
    await doConnect();
  }
}

async function _connectToDevice(d) {
  d.addEventListener('gattserverdisconnected', onDisconnected);
  gatt   = await d.gatt.connect();
  const svc = await gatt.getPrimaryService(NUS_SERVICE);
  rxChar = await svc.getCharacteristic(NUS_RX);
  txChar = await svc.getCharacteristic(NUS_TX);
  txChar.addEventListener('characteristicvaluechanged', onNotify);
  await txChar.startNotifications();
  device = d;

  setStatus('connected', `Connected: ${d.name}`);
  const infoRow = document.getElementById('infoRow');
  if (infoRow) infoRow.style.display = 'flex';

  // Remember this device for auto-reconnect across page navigations
  localStorage.setItem('lsw-device-name', d.name || '');

  log('Connected! Starting handshake…', 'info');
  await doHandshake();
}

async function doConnect() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth not supported. Use Chrome/Chromium.', 'err');
    setStatus('connecting', 'Web Bluetooth not available');
    return;
  }
  setStatus('connecting', 'Requesting device…');
  connecting = true;
  try {
    const d = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [NUS_SERVICE],
    });
    await _connectToDevice(d);
  } catch(e) {
    log(`Connection failed: ${e.message}`, 'err');
    setStatus('', `Failed: ${e.message}`);
    device = null; gatt = null; rxChar = null; txChar = null;
  }
  connecting = false;
}

// ============================================================
// Reconnect banner (injected into every BLE-enabled page)
// ============================================================
function _showReconnectBanner() {
  const savedName = localStorage.getItem('lsw-device-name');
  if (!savedName) return;

  let banner = document.getElementById('bleReconnectBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'bleReconnectBanner';
    banner.style.cssText = [
      'display:none','position:fixed','bottom:1.25rem','left:50%',
      'transform:translateX(-50%)','z-index:8500',
      'background:#13131a','border:1px solid #8b5cf6',
      'border-radius:14px','padding:0.65rem 1rem',
      'display:flex','align-items:center','gap:0.75rem',
      'box-shadow:0 6px 28px rgba(0,0,0,0.6)',
      'font-size:0.85rem','color:#e2e8f0','white-space:nowrap',
    ].join(';');
    document.body.appendChild(banner);
  }

  banner.innerHTML =
    `<span>⚡ <strong>${savedName}</strong> not connected</span>` +
    `<button id="bleReconnectBtn" style="background:#8b5cf6;border:none;border-radius:8px;` +
    `color:#fff;padding:0.38rem 0.9rem;cursor:pointer;font-size:0.82rem;font-weight:600">` +
    `🔗 Reconnect</button>` +
    `<button onclick="localStorage.removeItem('lsw-device-name');` +
    `document.getElementById('bleReconnectBanner').style.display='none'"` +
    ` style="background:none;border:none;color:#64748b;cursor:pointer;font-size:1rem;padding:0 2px">✕</button>`;

  banner.style.display = 'flex';

  document.getElementById('bleReconnectBtn').onclick = async () => {
    _hideBanner();
    await tryAutoReconnect(true); // true = show picker if getDevices fails
  };
}

function _hideBanner() {
  const b = document.getElementById('bleReconnectBanner');
  if (b) b.style.display = 'none';
}

// ============================================================
// Auto-reconnect to previously paired device
// ============================================================
async function tryAutoReconnect(fallbackToPicker = false) {
  const savedName = localStorage.getItem('lsw-device-name');
  if (!savedName) return;

  // Try getDevices() first (no picker, no user gesture needed)
  if (navigator.bluetooth?.getDevices) {
    try {
      const devices = await navigator.bluetooth.getDevices();
      const d = devices.find(d => d.name === savedName);
      if (d) {
        connecting = true;
        setStatus('connecting', `Reconnecting to ${savedName}…`);
        log(`Auto-reconnecting to ${savedName}…`, 'info');
        await _connectToDevice(d);
        connecting = false;
        _hideBanner();
        return; // success
      }
    } catch(e) {
      log(`getDevices failed: ${e.message}`, 'info');
    }
    connecting = false;
  }

  // Fallback: show the device picker (requires user gesture — only when called from button click)
  if (fallbackToPicker) {
    await doConnect();
    return;
  }

  // Silent fail on page load — show the banner instead
  setStatus('', `${savedName} — tap Reconnect`);
  _showReconnectBanner();
}

async function doDisconnect() {
  // Clear saved device so we don't auto-reconnect after intentional disconnect
  localStorage.removeItem('lsw-device-name');
  _hideBanner();
  if (gatt) gatt.disconnect();
}

function onDisconnected() {
  setStatus('', 'Disconnected');
  const infoRow = document.getElementById('infoRow');
  if (infoRow) infoRow.style.display = 'none';
  device = null; gatt = null; rxChar = null; txChar = null; deviceId = null;
  updateManagerUI();
  log('Disconnected', 'info');
  // Show banner so user can quickly reconnect
  _showReconnectBanner();
}

// Try auto-reconnect on every page load (after a short delay so UI is ready)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => tryAutoReconnect(false), 1200);
});

// ============================================================
// Handshake
// ============================================================
let notifyQueue = [];
let notifyResolvers = [];

function onNotify(event) {
  const data = new Uint8Array(event.target.value.buffer);
  const hex = Array.from(data).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  log(`← ${hex}`, 'recv');
  processPacket(data);
  if (notifyResolvers.length > 0) {
    const resolve = notifyResolvers.shift();
    resolve(data);
  } else {
    notifyQueue.push(data);
  }
}

function waitForNotify(timeout = 3000) {
  if (notifyQueue.length > 0) return Promise.resolve(notifyQueue.shift());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = notifyResolvers.indexOf(resolve);
      if (idx !== -1) notifyResolvers.splice(idx, 1);
      reject(new Error('Notify timeout'));
    }, timeout);
    notifyResolvers.push(data => { clearTimeout(timer); resolve(data); });
  });
}

async function doHandshake() {
  try {
    // Step 1: Init
    await sendInit();
    const r1 = await waitForNotify(3000);
    // Expect FF B4 02 01 02 47
    if (r1[1] !== 0xB4) { log('Unexpected response to init', 'err'); }

    // Step 2: Request device info
    await sendPacket(0x21, []);
    const r2 = await waitForNotify(3000);
    // FF 21 LEN 01 02 FF FF 17 2F 78 [ID_H] [ID_L] CS
    if (r2[1] === 0x21 && r2.length >= 12) {
      const idH = r2[r2.length - 3];
      const idL = r2[r2.length - 2];
      deviceId = [idH, idL];
      log(`Device ID: ${idH.toString(16).padStart(2,'0').toUpperCase()}:${idL.toString(16).padStart(2,'0').toUpperCase()}`, 'info');
    }

    // Step 3: Register
    if (deviceId) {
      await sendPacket(0xAD, [0x02, deviceId[0], deviceId[1]]);
      const r3 = await waitForNotify(2000).catch(() => null);
      if (r3 && r3[1] === 0xAD) log('Device registered OK', 'info');
    }

    // Step 4: Battery
    await sendPacket(0x16, []);
    const r4 = await waitForNotify(2000).catch(() => null);
    if (r4 && r4[1] === 0x16 && r4.length >= 5) {
      const batt = r4[3];
      document.getElementById('batteryVal').textContent = `${batt}`;
    }

    // Step 5: Query LED state (C6, C8, CA)
    await queryLEDState();

    log('Handshake complete!', 'info');
    updateManagerUI();

  } catch(e) {
    log(`Handshake error: ${e.message}`, 'err');
  }
}

async function queryLEDState() {
  for (const cmd of [0xC6, 0xC8, 0xCA]) {
    await sendPacket(cmd, []);
    try {
      await waitForNotify(2000);
    } catch { /* ignore timeout */ }
    await delay(200);
  }
}

// ============================================================
// Process incoming packets
// ============================================================
function processPacket(data) {
  if (data.length < 3) return;
  const cmd = data[1];
  switch(cmd) {
    case 0xB4:
      break;
    case 0x15: {
      // Heartbeat — payload is always [01, 01, brightness?], NOT the current color mode.
      // Do NOT update currentEffect here — user-selected color is the source of truth.
      break;
    }
    case 0x16: {
      if (data.length >= 5) {
        document.getElementById('batteryVal').textContent = `${data[3]}`;
      }
      break;
    }
    case 0xC6: case 0xC8: case 0xCA: {
      // LED segment status (handled in query flow)
      break;
    }
  }
}
