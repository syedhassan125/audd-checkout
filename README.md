# AUDD Checkout SDK

Accept **Australian Dollar (AUDD) stablecoin** payments on Solana in under 5 minutes.

AUDD is a regulated, 1:1 AUD-backed stablecoin issued by AUDC Pty Ltd under an Australian Financial Services Licence (AFSL). Transactions settle on Solana in under 2 seconds for a fraction of a cent.

---

## Quick Start (Browser)

```html
<script src="https://unpkg.com/audd-checkout/src/widget.js"></script>

<button onclick="AuddWidget.open({
  merchantAddress: 'YOUR_SOLANA_WALLET',
  amount: 49.99,
  label: 'My Store',
  message: 'Order #1042',
  onSuccess: (sig) => console.log('Paid!', sig)
})">
  Pay with AUDD
</button>
```

That's it. The widget handles QR generation, payment detection, and confirmation.

---

## Node.js / TypeScript

```bash
npm install audd-checkout
```

```typescript
import { AuddCheckout } from 'audd-checkout';

const checkout = new AuddCheckout({
  merchantAddress: 'YOUR_SOLANA_WALLET',
  amount: 49.99,
  label: 'My Store',
  message: 'Order #1042',
  onSuccess: (signature) => {
    // Update DB, ship order, etc.
    console.log('Payment confirmed:', signature);
  },
  onError: (err) => console.error(err),
});

// Get the Solana Pay URL and QR data
const session = checkout.createSession();
console.log(session.url); // solana:WALLET?amount=49.99&spl-token=AUDD...

// Start polling for on-chain confirmation
checkout.startPolling();
```

---

## Config Options

| Option | Type | Required | Description |
|---|---|---|---|
| `merchantAddress` | `string` | ✅ | Your Solana wallet (receives AUDD) |
| `amount` | `number` | ✅ | Amount in AUD (e.g. `49.99`) |
| `label` | `string` | ✅ | Merchant name shown in wallet |
| `message` | `string` | — | Order description |
| `reference` | `string` | — | Unique payment ID (auto-generated if omitted) |
| `onSuccess` | `(sig: string) => void` | — | Called on confirmed payment |
| `onError` | `(err: Error) => void` | — | Called on failure or timeout |
| `pollInterval` | `number` | — | Polling frequency in ms (default: `2000`) |
| `timeout` | `number` | — | Give up after ms (default: `300000` = 5 min) |
| `rpcUrl` | `string` | — | Custom Solana RPC endpoint |

---

## How It Works

1. **Session created** — SDK generates a unique `reference` key and encodes a Solana Pay URL with the AUDD token mint and payment amount.
2. **Customer pays** — They scan the QR in Phantom / Solflare / Backpack and approve the SPL token transfer.
3. **On-chain detection** — SDK polls Solana using `findReference` to detect the transaction by reference key.
4. **Validation** — `validateTransfer` confirms the correct amount, token, and recipient.
5. **`onSuccess` fires** — You receive the transaction signature. AUDD is in your wallet.

---

## AUDD Token

- **Mint address (Solana):** `AUDDttiEpCydTm7joUMbYddm72jAWXZnCpPZtDoxqBSw`
- **Decimals:** 6
- **Backing:** 1:1 AUD, held in a Bare Trust by AUDC Pty Ltd
- **Issuer:** [audd.digital](https://audd.digital)

---

## Compatible Wallets

- Phantom
- Solflare
- Backpack
- Any Solana Pay–compatible wallet

---

## Live Demo

**https://syedhassan125.github.io/audd-checkout/**

See the full widget in action on a mock storefront — click "Buy with AUDD" on any product.

---

## License

MIT
