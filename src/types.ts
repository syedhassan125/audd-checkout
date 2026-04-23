export interface AuddCheckoutConfig {
  /** Merchant's Solana wallet address (receives AUDD) */
  merchantAddress: string;
  /** Amount in AUD (e.g. 49.99) */
  amount: number;
  /** Order/reference label shown to payer */
  label: string;
  /** Short order message */
  message?: string;
  /** Unique reference ID for this payment */
  reference?: string;
  /** Callback when payment is confirmed */
  onSuccess?: (signature: string) => void;
  /** Callback when payment fails or times out */
  onError?: (error: Error) => void;
  /** Polling interval in ms (default: 2000) */
  pollInterval?: number;
  /** Timeout in ms before giving up (default: 300000 = 5min) */
  timeout?: number;
}

export interface PaymentStatus {
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  signature?: string;
  error?: string;
}

export interface CheckoutSession {
  url: string;
  qrData: string;
  reference: string;
  amount: number;
  merchantAddress: string;
}
