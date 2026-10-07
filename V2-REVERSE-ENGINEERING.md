# TAEMIN Lightstick V2 — Guia de Reverse-Engineering

> Objetivo: descobrir **se** o V2 (Galaxy Corp) pode ser controlado pelo site via Web Bluetooth
> e, se sim, **capturar os comandos** para o replicar. Guia para executar quando tiveres o V2 na mão.

---

## O que precisas

- **O lightstick V2** (bem carregado / pilhas novas).
- **Telemóvel Android** — essencial para a captura (o iPhone **não** deixa fazer sniffing de Bluetooth).
- **nRF Connect** (da Nordic, grátis, Play Store) — para inspecionar o Bluetooth do aparelho.
- A **app oficial** do V2, se existir (ver quem é o developer — dá pista do protocolo).
- **Computador com Wireshark** (grátis) — para ler o registo capturado.
- (Opcional) cabo USB + **adb** para extrair o log mais facilmente.

---

## FASE 1 — Scan GATT com nRF Connect (o teste de 2 minutos)

Isto responde à pergunta mais importante — **dá ou não para controlar** — sem depender de app nenhuma.

1. Põe o lightstick em **modo Bluetooth/emparelhamento**. (Normalmente é manter 2 botões premidos uns segundos até piscar azul — confirma no manual do V2. No V1 era manter esquerdo+direito.)
2. Abre o **nRF Connect** → **SCAN** → encontra o aparelho (o nome pode ser tipo `TAEMIN...`).
3. **CONNECT** → abre a lista de **Services** e **Characteristics**.
4. **O que procurar:**
   - **Nordic UART Service (NUS)** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`, com:
     - RX (escrita) `6e400002-...`
     - TX (notify) `6e400003-...`
     → Se aparecer, é o **mesmo** serviço do V1: forte indício de protocolo parecido.
   - Qualquer característica com a propriedade **WRITE** ou **WRITE NO RESPONSE** (ícone de seta ↑).
5. **Experiência rápida:** numa característica de escrita, envia bytes de teste e olha para a luz.
   - Primeira hipótese — o **formato do V1**: `FF 15 <effectId> 01 FF` (mudar cor), `FF 13 <0-10> FF` (brilho), `FF 12 FF` (off).
   - Como é outra empresa, pode não funcionar — mas é o teste mais rápido a fazer primeiro.
   - **Se a luz reagir → 🎉 dá para controlar.** Passa à Fase 2 para mapear tudo.
6. **Regista tudo:** UUIDs dos serviços e das características + as suas propriedades (screenshot serve).

### Ponto de decisão
- ✅ **Há característica de escrita e a luz muda** → é viável no site. Vai à Fase 2.
- ⚠️ **Não há escrita / exige emparelhamento encriptado (bonding) / só faz notify** → muito mais difícil ou impossível via Web Bluetooth. Anota e reavalia (ver "Cautelas").

---

## FASE 2 — Capturar a app oficial (se o V2 tiver uma)

Revela os **comandos exatos** que a app envia, para os replicares.

### Ativar a captura (Android HCI snoop log)
1. Definições → **Acerca do telemóvel** → toca 7× em **Número de compilação** → ativa "Opções de programador".
2. **Opções de programador** → ativa **"Ativar registo de HCI Bluetooth snoop"**.
3. **Desliga e liga o Bluetooth** (para começar a gravar do zero).

### Gerar tráfego (a parte importante — faz devagar e anota)
4. Abre a **app oficial** e liga ao lightstick.
5. Faz **cada ação, uma de cada vez**, e **anota a hora/ordem**:
   - cada **cor**, cada nível de **brilho**, cada **modo/efeito**, **ligar/desligar**.
   - Espera 2-3 seg entre cada ação → o log fica muito mais fácil de ler depois.

### Extrair e ler o log
6. Extrai o `btsnoop_hci.log`:
   - Mais fácil: **Opções de programador → "Criar relatório de erro" (bug report)** → o log vem lá dentro.
   - Ou por USB: `adb bugreport` e procura `FS/data/misc/bluetooth/logs/btsnoop_hci.log`.
7. Abre o `btsnoop_hci.log` no **Wireshark**.
8. Filtra as escritas (é aqui que estão os comandos):
   - `btatt.opcode == 0x52` (Write Command) ou `btatt.opcode == 0x12` (Write Request)
   - Olha para o campo **Value** (os bytes) de cada escrita.
9. **Cruza** cada ação que fizeste (pela hora) com o pacote correspondente → tens os bytes de cada função.
10. Monta uma **tabela de comandos**: cor → bytes, brilho → bytes, modo → bytes, etc.

---

## FASE 3 — Replicar no site

- O site já fala Web Bluetooth via `sendPacket(cmd, payload)` em `js/ble.js`, usando o Nordic UART do V1.
- **Se o V2 usar o mesmo NUS + pacotes parecidos** → reaproveitas quase tudo; só acrescentas um "perfil V2" e deteção de qual lightstick está ligado.
- **Se os UUIDs forem diferentes** → adicionas os UUIDs do serviço/característica do V2 e uma tradução para o formato de comandos dele.
- ⚠️ **Requisito do Web Bluetooth:** a característica tem de ser **escrevível sem bonding/encriptação**. Se o V2 exigir emparelhamento encriptado, o Web Bluetooth pode **não** conseguir — mesmo sabendo o protocolo. Este é o maior risco técnico.

---

## Cautelas / armadilhas

- **iPhone não serve para capturar** (não tem HCI snoop). Usa Android para a Fase 2. (O Bluefy no iOS é só para *usar* o site, não para sniffing.)
- **Modo concerto** costuma ser separado e possivelmente encriptado → ignora-o, foca no **"Self Mode"** / controlo manual de cor.
- **Segurança/handshake:** lightsticks novos podem exigir uma sequência de autenticação antes de aceitarem comandos, ou usar valores que mudam (rolling). Se as escritas só funcionarem depois de um "aperto de mão", **captura também essa sequência** no sniff.
- **Sê metódico:** uma ação de cada vez, anotada, senão o log fica impossível de cruzar.

---

## Referência rápida — Protocolo do V1 (hipótese inicial para o V2)

- **Service:** Nordic UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **Write (RX):** `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **Notify (TX):** `6e400003-b5a3-f393-e0a9-e50e24dcca9e`
- **Formato do pacote:** `FF [CMD] [LEN] [payload...] FF`
- Comandos: `0x12` off · `0x13` brilho `[0-10]` · `0x14` auto-mode · `0x15` cor/efeito `[effectId, 0x01]` · `0x16` bateria · `0x21` UID

---

## Resumo do fluxo de decisão

```
Tens o V2 → nRF Connect scan
   │
   ├─ Há característica WRITE e a luz muda?
   │     ├─ SIM → capturar app (Fase 2) → mapear comandos → replicar no site (Fase 3) ✅
   │     └─ NÃO → exige bonding/encriptação ou só notify?
   │              └─ Provavelmente NÃO dá via Web Bluetooth ⚠️ (reavaliar / anunciar honestamente)
   │
   └─ Regista sempre UUIDs + propriedades para referência.
```
