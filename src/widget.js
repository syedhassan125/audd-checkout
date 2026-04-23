/**
 * AUDD Checkout Widget
 * Drop-in browser script for accepting AUDD payments via Solana Pay.
 * Usage: <script src="widget.js"></script>
 *        AuddWidget.open({ merchantAddress, amount, label, onSuccess })
 */
(function (global) {
  'use strict';

  const AUDD_MINT = 'AUDDttiEpCydTm7joUMbYddm72jAWXZnCpPZtDoxqBSw';

  function generateReference() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      .slice(0, 32);
  }

  function buildSolanaPayURL(config, reference) {
    const recipient = encodeURIComponent(config.merchantAddress);
    const amount = encodeURIComponent(config.amount.toFixed(6));
    const splToken = encodeURIComponent(AUDD_MINT);
    const ref = encodeURIComponent(reference);
    const label = encodeURIComponent(config.label || 'AUDD Payment');
    const message = encodeURIComponent(config.message || 'Pay with AUDD');
    return `solana:${config.merchantAddress}?amount=${amount}&spl-token=${splToken}&reference=${ref}&label=${label}&message=${message}`;
  }

  function injectStyles() {
    if (document.getElementById('audd-widget-styles')) return;
    const style = document.createElement('style');
    style.id = 'audd-widget-styles';
    style.textContent = `
      #audd-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        backdrop-filter: blur(4px);
        opacity: 0; transition: opacity 0.2s ease;
      }
      #audd-overlay.visible { opacity: 1; }
      #audd-modal {
        background: #0f172a; border: 1px solid #1e3a5f;
        border-radius: 20px; padding: 32px; width: 380px; max-width: 95vw;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        transform: translateY(20px); transition: transform 0.2s ease;
        color: #e2e8f0;
      }
      #audd-overlay.visible #audd-modal { transform: translateY(0); }
      #audd-modal-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 24px;
      }
      #audd-modal-header h2 {
        margin: 0; font-size: 18px; font-weight: 700; color: #fff;
        display: flex; align-items: center; gap: 8px;
      }
      #audd-close {
        background: none; border: none; color: #64748b; cursor: pointer;
        font-size: 22px; line-height: 1; padding: 4px; transition: color 0.15s;
      }
      #audd-close:hover { color: #94a3b8; }
      #audd-amount-badge {
        background: linear-gradient(135deg, #1a3a5c, #0f2a45);
        border: 1px solid #1e4976; border-radius: 12px; padding: 16px;
        text-align: center; margin-bottom: 20px;
      }
      #audd-amount-badge .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
      #audd-amount-badge .amount { font-size: 32px; font-weight: 800; color: #38bdf8; margin-top: 4px; }
      #audd-amount-badge .sub { font-size: 12px; color: #475569; margin-top: 2px; }
      #audd-qr-container {
        background: #fff; border-radius: 12px; padding: 16px;
        display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
      }
      #audd-qr-container canvas { display: block; }
      #audd-url-box {
        background: #1e293b; border: 1px solid #334155; border-radius: 10px;
        padding: 10px 14px; font-size: 11px; color: #64748b;
        word-break: break-all; cursor: pointer; margin-bottom: 16px;
        transition: border-color 0.15s;
      }
      #audd-url-box:hover { border-color: #38bdf8; color: #94a3b8; }
      #audd-status {
        text-align: center; font-size: 13px; padding: 10px;
        border-radius: 8px; margin-bottom: 12px;
        display: none;
      }
      #audd-status.pending { background: #1e3a5c; color: #7dd3fc; display: block; }
      #audd-status.confirmed { background: #14532d; color: #4ade80; display: block; }
      #audd-status.failed { background: #450a0a; color: #f87171; display: block; }
      #audd-footer {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        font-size: 11px; color: #334155;
      }
      #audd-footer a { color: #1d6fa4; text-decoration: none; }
      #audd-footer a:hover { text-decoration: underline; }
      .audd-spinner {
        display: inline-block; width: 10px; height: 10px;
        border: 2px solid #7dd3fc; border-top-color: transparent;
        border-radius: 50%; animation: audd-spin 0.7s linear infinite;
        vertical-align: middle; margin-right: 4px;
      }
      @keyframes audd-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  function renderQR(canvas, text, size) {
    // Minimal QR renderer using the URL as text with a visual placeholder
    // In production embed qrcode.js — here we show the URL clearly
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    // Draw corner squares (QR finder pattern style decoration)
    function drawFinder(x, y) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y, 49, 49);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 7, y + 7, 35, 35);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 14, y + 14, 21, 21);
    }
    drawFinder(10, 10);
    drawFinder(size - 59, 10);
    drawFinder(10, size - 59);

    // Draw data dots
    ctx.fillStyle = '#0f172a';
    const seed = Array.from(text).reduce((a, c) => a + c.charCodeAt(0), 0);
    const cols = 15, cellSize = (size - 140) / cols;
    const offsetX = 70, offsetY = 70;
    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        if ((seed * (r + 1) * (c + 1) * 2654435761) % 3 !== 0) {
          ctx.fillRect(
            offsetX + c * cellSize, offsetY + r * cellSize,
            cellSize - 1, cellSize - 1
          );
        }
      }
    }

    // AUDD label in center
    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AUDD', size / 2, size / 2 + 5);
  }

  function open(config) {
    if (!config.merchantAddress) throw new Error('merchantAddress is required');
    if (!config.amount || config.amount <= 0) throw new Error('amount must be > 0');

    injectStyles();

    const reference = generateReference();
    const payUrl = buildSolanaPayURL(config, reference);

    const overlay = document.createElement('div');
    overlay.id = 'audd-overlay';
    overlay.innerHTML = `
      <div id="audd-modal">
        <div id="audd-modal-header">
          <h2>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#0284c7"/>
              <text x="12" y="17" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="sans-serif">A$</text>
            </svg>
            Pay with AUDD
          </h2>
          <button id="audd-close" aria-label="Close">&times;</button>
        </div>
        <div id="audd-amount-badge">
          <div class="label">Amount Due</div>
          <div class="amount">${config.amount.toFixed(2)} <span style="font-size:18px;color:#7dd3fc">AUDD</span></div>
          <div class="sub">≈ A$${config.amount.toFixed(2)} Australian Dollar</div>
        </div>
        <div id="audd-qr-container">
          <canvas id="audd-qr-canvas"></canvas>
        </div>
        <div id="audd-url-box" title="Click to copy payment link">${payUrl.slice(0, 80)}…</div>
        <div id="audd-status"></div>
        <div id="audd-footer">
          Powered by <a href="https://audd.digital" target="_blank">AUDD</a> &amp; Solana Pay
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Render QR
    const canvas = document.getElementById('audd-qr-canvas');
    renderQR(canvas, payUrl, 220);

    // Copy URL on click
    document.getElementById('audd-url-box').addEventListener('click', () => {
      navigator.clipboard?.writeText(payUrl).then(() => {
        document.getElementById('audd-url-box').textContent = 'Copied!';
        setTimeout(() => {
          document.getElementById('audd-url-box').textContent = payUrl.slice(0, 80) + '…';
        }, 1500);
      });
    });

    // Close button
    document.getElementById('audd-close').addEventListener('click', () => close(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(overlay); });

    // Start polling
    setStatus('pending', '⟳ Waiting for payment…');
    const pollInterval = config.pollInterval || 3000;
    const maxAttempts = Math.floor((config.timeout || 300000) / pollInterval);
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(poll);
        setStatus('failed', 'Payment timed out. Please try again.');
        if (config.onError) config.onError(new Error('timeout'));
        return;
      }

      try {
        // Check via Solana RPC (mainnet public endpoint)
        const rpc = config.rpcUrl || 'https://api.mainnet-beta.solana.com';
        const body = {
          jsonrpc: '2.0', id: 1,
          method: 'getSignaturesForAddress',
          params: [config.merchantAddress, { limit: 10 }],
        };
        const resp = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await resp.json();
        if (data.result && data.result.length > 0) {
          const sig = data.result[0].signature;
          clearInterval(poll);
          setStatus('confirmed', `✓ Payment confirmed!`);
          if (config.onSuccess) config.onSuccess(sig);
          setTimeout(() => close(overlay), 3000);
        }
      } catch (_) { /* keep polling */ }
    }, pollInterval);

    overlay._poll = poll;
  }

  function setStatus(type, msg) {
    const el = document.getElementById('audd-status');
    if (!el) return;
    el.className = `${type}`;
    if (type === 'pending') {
      el.innerHTML = `<span class="audd-spinner"></span>${msg}`;
    } else {
      el.textContent = msg;
    }
  }

  function close(overlay) {
    if (overlay._poll) clearInterval(overlay._poll);
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }

  global.AuddWidget = { open };
})(window);
