// ============================================================
// ble.js — Comunicação Bluetooth Low Energy (BLE)
//
// PROTOCOLO USADO: Nordic UART Service (NUS)
//   É um serviço BLE padrão que emula uma porta série (UART).
//   Tem duas características:
//     RX (6e400002) — escrevemos aqui para enviar comandos
//     TX (6e400003) — recebemos aqui as respostas do lightstick
//
// FORMATO DOS PACOTES:
//   Envio:   FF [CMD] [LEN] [payload...] FF
//   Resposta: FF [CMD] [LEN] [dados...] [checksum]
//
// COMANDOS PRINCIPAIS:
//   0x13 — Brilho directo (payload: [nivel 0-10])
//   0x14 — Modo automático / animação (payload: [tipo, 0x0F])
//   0x15 — Efeito/cor (payload: [effectId, 0x01])
//   0x16 — Query bateria
//   0x18 — Init (formato especial: FF 18 00 FF 00 00)
//   0x21 — Info do dispositivo (retorna ID único)
//   0xAD — Registo com ID do dispositivo
//   0x12 — Apagar luz
// ============================================================

// UUIDs do serviço Nordic UART
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_RX      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // write (enviar para o lightstick)
const NUS_TX      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // notify (receber do lightstick)

// ============================================================
// Estado BLE — estas variáveis vivem enquanto a página estiver aberta.
// Como é uma SPA, nunca recarregam → BLE mantém-se ligado.
// ============================================================
let device = null;   // dispositivo primário (BluetoothDevice)
let gatt   = null;   // servidor GATT primário
let rxChar = null;   // RX primário (escrita)
let txChar = null;   // TX primário (notificações)
let deviceId    = null;  // [ID_H, ID_L] do dispositivo primário
let connecting  = false; // true enquanto está a tentar ligar

// ── Multi-lightstick: dispositivos adicionais ─────────────────
// Cada entrada: { device, gatt, rxChar, txChar }
let _extraDevices = [];

// ============================================================
// Construir e validar pacotes
// ============================================================

// Constrói um pacote para enviar ao lightstick
// Formato: FF CMD LEN [payload...] FF
function buildPacket(cmd, payload = []) {
  return new Uint8Array([0xFF, cmd, payload.length, ...payload, 0xFF]);
}

// Calcula checksum para validar pacotes recebidos
// (soma de bytes da posição 1 até ao penúltimo, complemento de 256)
function calcChecksum(bytes) {
  let sum = 0;
  for (let i = 1; i < bytes.length - 1; i++) sum += bytes[i];
  return (0x100 - (sum & 0xFF)) & 0xFF;
}

// ============================================================
// Enviar um pacote BLE
// Tenta writeValueWithoutResponse primeiro (mais rápido),
// cai para writeValue se falhar (mais compatível).
// ============================================================
async function sendPacket(cmd, payload = []) {
  const anyConnected = rxChar || _extraDevices.some(d => d.rxChar);
  if (!anyConnected) { log('Not connected', 'err'); return; }
  const pkt = buildPacket(cmd, payload);
  const hex = Array.from(pkt).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  log(`→ ${hex}`, 'send');

  async function _write(rc) {
    try { await rc.writeValueWithoutResponse(pkt); }
    catch(e) { try { await rc.writeValue(pkt); } catch(e2) { log(`Write error: ${e2.message}`, 'err'); } }
  }

  if (rxChar) await _write(rxChar);
  for (const ed of _extraDevices) { if (ed.rxChar) await _write(ed.rxChar); }
}

// Pacote de init especial — formato diferente dos outros: FF 18 00 FF 00 00
async function sendInit() {
  if (!rxChar) return;
  const pkt = new Uint8Array([0xFF, 0x18, 0x00, 0xFF, 0x00, 0x00]);
  log(`→ FF 18 00 FF 00 00  [INIT]`, 'send');
  try { await rxChar.writeValueWithoutResponse(pkt); } catch(e) {
    try { await rxChar.writeValue(pkt); } catch {}
  }
}

// ============================================================
// Modal do Lightstick Manager
// Permite ver dispositivos ligados e fazer pair de novos.
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

// Actualiza o conteúdo do modal consoante o estado actual da ligação
function updateManagerUI() {
  const pairBtn          = document.getElementById('pairBtn');
  const noDevicesMsg     = document.getElementById('noDevicesMsg');
  const connectedDevices = document.getElementById('connectedDevices');
  if (!pairBtn || !noDevicesMsg || !connectedDevices) return;

  connectedDevices.querySelectorAll('.connected-device-row').forEach(el => el.remove());

  // Junta dispositivo primário + extra
  const all = [];
  if (device && gatt && gatt.connected) all.push({ d: device, isPrimary: true });
  _extraDevices.filter(ed => ed.gatt?.connected).forEach(ed => all.push({ d: ed.device, isPrimary: false }));

  if (all.length > 0) {
    noDevicesMsg.style.display = 'none';
    const battEl = document.querySelector('[data-ble-battery]');
    all.forEach(({ d, isPrimary }, i) => {
      const batt = isPrimary && battEl ? battEl.textContent : '--';
      const row = document.createElement('div');
      row.className = 'connected-device-row';
      row.innerHTML = `
        <div class="connected-device-info">
          <div class="connected-dot"></div>
          <span>${d.name || 'TAEMIN LIGHTSTICK'}${all.length > 1 ? ` #${i + 1}` : ''}</span>
          ${isPrimary && batt !== '--' ? `<span style="color:var(--muted);font-size:0.75rem">🔋 ${batt}</span>` : ''}
        </div>
        <button class="btn btn-danger" style="font-size:0.75rem;padding:0.3rem 0.7rem"
          onclick="${isPrimary ? 'doDisconnect()' : `_disconnectExtra('${d.id || d.name}')`}">Disconnect</button>
      `;
      connectedDevices.appendChild(row);
    });
    pairBtn.textContent = '⚡ Pair Another Lightstick';
    pairBtn.disabled = false;
  } else {
    noDevicesMsg.style.display = 'block';
    pairBtn.innerHTML = '⚡ Pair New Lightstick';
    pairBtn.disabled = connecting;
  }
}

// Desligar um dispositivo extra pelo id ou nome
function _disconnectExtra(idOrName) {
  const idx = _extraDevices.findIndex(ed => ed.device.id === idOrName || ed.device.name === idOrName);
  if (idx !== -1) {
    try { _extraDevices[idx].gatt?.disconnect(); } catch {}
    _extraDevices.splice(idx, 1);
    updateManagerUI();
    const total = (device && gatt?.connected ? 1 : 0) + _extraDevices.length;
    if (total > 0) setStatus('connected', `${total} lightstick${total > 1 ? 's' : ''} connected`);
  }
}

async function doPair() {
  closeManager();
  // Se já há dispositivo primário, emparelha um adicional
  if (device && gatt && gatt.connected) {
    await _pairExtra();
  } else {
    await doConnect();
  }
}

// Emparelhar lightstick adicional sem desligar o primário
async function _pairExtra() {
  if (!navigator.bluetooth) return;
  try {
    const d = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'TAEMIN' }],
      optionalServices: [NUS_SERVICE],
    }).catch(() => navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [NUS_SERVICE] }));
    if (!d) return;

    d.addEventListener('gattserverdisconnected', () => {
      _extraDevices = _extraDevices.filter(ed => ed.device !== d);
      updateManagerUI();
      log(`Extra disconnected: ${d.name}`, 'info');
    });

    const g   = await d.gatt.connect();
    const svc = await g.getPrimaryService(NUS_SERVICE);
    const rx  = await svc.getCharacteristic(NUS_RX);
    const tx  = await svc.getCharacteristic(NUS_TX);
    tx.addEventListener('characteristicvaluechanged', onNotify);
    await tx.startNotifications();
    _extraDevices.push({ device: d, gatt: g, rxChar: rx, txChar: tx });

    // Handshake simplificado para dispositivo extra
    const initPkt = new Uint8Array([0xFF, 0x18, 0x00, 0xFF, 0x00, 0x00]);
    await rx.writeValueWithoutResponse(initPkt).catch(() => rx.writeValue(initPkt));
    await delay(400);

    const total = 1 + _extraDevices.length;
    setStatus('connected', `${total} lightsticks connected`);
    log(`Paired extra: ${d.name} (${total} total)`, 'info');
    updateManagerUI();
  } catch(e) {
    log(`Extra pair failed: ${e.message}`, 'err');
    openManager();
  }
}

// Liga ou desliga consoante o estado actual
async function toggleConnect() {
  if (device && gatt && gatt.connected) {
    await doDisconnect();
  } else {
    await doConnect();
  }
}

// Liga a um dispositivo BLE já obtido (reutilizado por doConnect e tryAutoReconnect)
async function _connectToDevice(d) {
  d.addEventListener('gattserverdisconnected', onDisconnected);
  gatt   = await d.gatt.connect();
  const svc = await gatt.getPrimaryService(NUS_SERVICE);
  rxChar = await svc.getCharacteristic(NUS_RX);
  txChar = await svc.getCharacteristic(NUS_TX);
  txChar.addEventListener('characteristicvaluechanged', onNotify);
  await txChar.startNotifications(); // começa a receber notificações
  device = d;

  setStatus('connected', `Connected: ${d.name}`);
  document.querySelectorAll('[data-ble-info]').forEach(el => el.style.display = 'flex');

  // Guarda o nome para tentar reconectar automaticamente depois
  localStorage.setItem('lsw-device-name', d.name || '');

  log('Connected! Starting handshake…', 'info');
  await doHandshake();
}

// Mostra o picker de dispositivos Bluetooth do browser e liga.
// Filtra por "TAEMIN" primeiro; se o utilizador cancelar/não encontrar,
// mostra todos os dispositivos como fallback.
async function doConnect() {
  if (!navigator.bluetooth) {
    log('Web Bluetooth not supported. Use Chrome/Chromium.', 'err');
    setStatus('connecting', 'Web Bluetooth not available');
    return;
  }
  setStatus('connecting', 'Requesting device…');
  connecting = true;
  try {
    let d;
    try {
      // Tenta primeiro filtrar por nome
      d = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'TAEMIN' }],
        optionalServices: [NUS_SERVICE],
      });
    } catch(filterErr) {
      if (filterErr.name === 'NotFoundError' || filterErr.name === 'NotSupportedError') {
        // Fallback: mostra todos os dispositivos
        d = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [NUS_SERVICE],
        });
      } else {
        throw filterErr; // utilizador cancelou ou outro erro
      }
    }
    await _connectToDevice(d);
  } catch(e) {
    log(`Connection failed: ${e.message}`, 'err');
    setStatus('', `Failed: ${e.message}`);
    device = null; gatt = null; rxChar = null; txChar = null;
  }
  connecting = false;
}

// ============================================================
// Banner de reconexão
// Aparece quando o lightstick se desconecta e há um nome guardado.
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
    await tryAutoReconnect(true); // true = mostra picker se getDevices falhar
  };
}

function _hideBanner() {
  const b = document.getElementById('bleReconnectBanner');
  if (b) b.style.display = 'none';
}

// ============================================================
// Auto-reconexão ao dispositivo anteriormente ligado
//
// ESTRATÉGIA:
//   1. Tenta getDevices() — não precisa de gesto do utilizador,
//      funciona se o browser já tem permissão para o dispositivo
//   2. Se falhar e fallbackToPicker=true, mostra o picker normal
//   3. Se fallbackToPicker=false (no load da página), mostra banner
// ============================================================
async function tryAutoReconnect(fallbackToPicker = false) {
  const savedName = localStorage.getItem('lsw-device-name');
  if (!savedName) return;

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
        return;
      }
    } catch(e) {
      log(`getDevices failed: ${e.message}`, 'info');
    }
    connecting = false;
  }

  if (fallbackToPicker) {
    await doConnect();
    return;
  }

  // Falha silenciosa no load da página — mostra banner em vez de popup
  setStatus('', `${savedName} — tap Reconnect`);
  _showReconnectBanner();
}

async function doDisconnect() {
  localStorage.removeItem('lsw-device-name');
  _hideBanner();
  // Desliga todos os dispositivos extra primeiro
  for (const ed of _extraDevices) {
    try { if (ed.gatt) ed.gatt.disconnect(); } catch {}
  }
  _extraDevices = [];
  if (gatt) gatt.disconnect();
}

// Chamado automaticamente quando o lightstick se desconecta (ex: bateria fraca)
function onDisconnected() {
  setStatus('', 'Disconnected');
  document.querySelectorAll('[data-ble-info]').forEach(el => el.style.display = 'none');
  device = null; gatt = null; rxChar = null; txChar = null; deviceId = null;
  updateManagerUI();
  log('Disconnected', 'info');
  _showReconnectBanner(); // mostra banner para reconectar rapidamente
}

// Tenta reconectar automaticamente 1.2s após o carregamento da página
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => tryAutoReconnect(false), 1200);
});

// ============================================================
// Sistema de notificações (respostas do lightstick)
//
// O lightstick envia respostas de forma assíncrona via TX notify.
// Usamos uma fila (notifyQueue) + lista de resolvers para que o
// handshake possa fazer await de cada resposta individualmente.
// ============================================================
let notifyQueue     = []; // pacotes recebidos mas ainda não consumidos
let notifyResolvers = []; // promises à espera de um pacote

// Chamado automaticamente quando o lightstick envia dados
function onNotify(event) {
  const data = new Uint8Array(event.target.value.buffer);
  const hex = Array.from(data).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  log(`← ${hex}`, 'recv');
  processPacket(data); // processa o pacote (bateria, etc.)

  // Entrega o pacote ao próximo waitForNotify() em espera,
  // ou guarda na fila se não há ninguém à espera
  if (notifyResolvers.length > 0) {
    const resolve = notifyResolvers.shift();
    resolve(data);
  } else {
    notifyQueue.push(data);
  }
}

// Espera pelo próximo pacote recebido (com timeout)
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

// ============================================================
// Handshake — sequência de inicialização após ligar
//
// PASSOS:
//   1. Init (FF 18 00 FF 00 00) → espera resposta B4
//   2. Pede info do dispositivo (0x21) → guarda ID único
//   3. Regista o dispositivo com o ID (0xAD)
//   4. Query bateria (0x16) → mostra nível
//   5. Query estado dos LEDs (C6, C8, CA)
// ============================================================
async function doHandshake() {
  try {
    // Passo 1: Init
    await sendInit();
    const r1 = await waitForNotify(3000);
    if (r1[1] !== 0xB4) { log('Unexpected response to init', 'err'); }

    // Passo 2: Info do dispositivo
    await sendPacket(0x21, []);
    const r2 = await waitForNotify(3000);
    // Resposta: FF 21 LEN 01 02 FF FF 17 2F 78 [ID_H] [ID_L] CS
    if (r2[1] === 0x21 && r2.length >= 12) {
      const idH = r2[r2.length - 3];
      const idL = r2[r2.length - 2];
      deviceId = [idH, idL];
      log(`Device ID: ${idH.toString(16).padStart(2,'0').toUpperCase()}:${idL.toString(16).padStart(2,'0').toUpperCase()}`, 'info');
    }

    // Passo 3: Registo com ID
    if (deviceId) {
      await sendPacket(0xAD, [0x02, deviceId[0], deviceId[1]]);
      const r3 = await waitForNotify(2000).catch(() => null);
      if (r3 && r3[1] === 0xAD) log('Device registered OK', 'info');
    }

    // Passo 4: Bateria
    await sendPacket(0x16, []);
    const r4 = await waitForNotify(2000).catch(() => null);
    if (r4 && r4[1] === 0x16 && r4.length >= 5) {
      const batt = r4[3];
      document.querySelectorAll('[data-ble-battery]').forEach(el => el.textContent = `${batt}`);
    }

    // Passo 5: Estado dos LEDs
    await queryLEDState();

    log('Handshake complete!', 'info');
    updateManagerUI();

  } catch(e) {
    log(`Handshake error: ${e.message}`, 'err');
  }
}

// Query ao estado dos três segmentos LED (C6, C8, CA)
async function queryLEDState() {
  for (const cmd of [0xC6, 0xC8, 0xCA]) {
    await sendPacket(cmd, []);
    try {
      await waitForNotify(2000);
    } catch { /* ignora timeout */ }
    await delay(200);
  }
}

// ============================================================
// Processar pacotes recebidos do lightstick
// ============================================================
function processPacket(data) {
  if (data.length < 3) return;
  const cmd = data[1];
  switch(cmd) {
    case 0xB4:
      break; // resposta ao init — sem acção especial
    case 0x15: {
      // Heartbeat do lightstick — NÃO actualizamos o efeito actual
      // porque é sempre [01, 01] e não o modo real de cor.
      break;
    }
    case 0x16: {
      // Resposta de bateria — actualiza todos os indicadores
      if (data.length >= 5) {
        document.querySelectorAll('[data-ble-battery]').forEach(el => el.textContent = `${data[3]}`);
      }
      break;
    }
    case 0xC6: case 0xC8: case 0xCA: {
      // Estado dos segmentos LED — tratado no fluxo de query
      break;
    }
  }
}
