import {
  Connection,
  PublicKey,
  clusterApiUrl,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { encodeURL, findReference, validateTransfer } from '@solana/pay';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BigNumber = require('bignumber.js');
import { AuddCheckoutConfig, CheckoutSession, PaymentStatus } from './types';

export const AUDD_MINT = new PublicKey('AUDDttiEpCydTm7joUMbYddm72jAWXZnCpPZtDoxqBSw');
export const AUDD_DECIMALS = 6;

export class AuddCheckout {
  private connection: Connection;
  private config: Required<AuddCheckoutConfig>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private timeoutTimer?: ReturnType<typeof setTimeout>;

  constructor(config: AuddCheckoutConfig, rpcUrl?: string) {
    this.connection = new Connection(rpcUrl ?? clusterApiUrl('mainnet-beta'), 'confirmed');
    this.config = {
      message: '',
      reference: this.generateReference(),
      onSuccess: () => {},
      onError: () => {},
      pollInterval: 2000,
      timeout: 300_000,
      ...config,
    };
  }

  /** Create a Solana Pay checkout session and return payment URL + QR data */
  createSession(): CheckoutSession {
    const recipient = new PublicKey(this.config.merchantAddress);
    const reference = new PublicKey(this.config.reference);
    const amount = new BigNumber(this.config.amount);

    const url = encodeURL({
      recipient,
      amount,
      splToken: AUDD_MINT,
      reference,
      label: this.config.label,
      message: this.config.message || undefined,
    });

    return {
      url: url.toString(),
      qrData: url.toString(),
      reference: this.config.reference,
      amount: this.config.amount,
      merchantAddress: this.config.merchantAddress,
    };
  }

  /** Start polling for payment confirmation */
  startPolling(): void {
    const reference = new PublicKey(this.config.reference);

    this.timeoutTimer = setTimeout(() => {
      this.stopPolling();
      this.config.onError(new Error('Payment timed out'));
    }, this.config.timeout);

    this.pollTimer = setInterval(async () => {
      try {
        const signatureInfo = await findReference(this.connection, reference, {
          finality: 'confirmed',
        });

        await validateTransfer(
          this.connection,
          signatureInfo.signature,
          {
            recipient: new PublicKey(this.config.merchantAddress),
            amount: new BigNumber(this.config.amount),
            splToken: AUDD_MINT,
            reference,
          },
          { commitment: 'confirmed' }
        );

        this.stopPolling();
        this.config.onSuccess(signatureInfo.signature);
      } catch (err: any) {
        // Reference not found yet — keep polling
        if (err?.name !== 'FindReferenceError') {
          this.stopPolling();
          this.config.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }, this.config.pollInterval);
  }

  /** Stop polling */
  stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
  }

  /** Get current status of a payment by reference */
  async getStatus(reference: string): Promise<PaymentStatus> {
    try {
      const ref = new PublicKey(reference);
      const signatureInfo = await findReference(this.connection, ref, {
        finality: 'confirmed',
      });

      await validateTransfer(
        this.connection,
        signatureInfo.signature,
        {
          recipient: new PublicKey(this.config.merchantAddress),
          amount: new BigNumber(this.config.amount),
          splToken: AUDD_MINT,
          reference: ref,
        },
        { commitment: 'confirmed' }
      );

      return { status: 'confirmed', signature: signatureInfo.signature };
    } catch (err: any) {
      if (err?.name === 'FindReferenceError') {
        return { status: 'pending' };
      }
      return { status: 'failed', error: String(err) };
    }
  }

  private generateReference(): string {
    const arr = new Uint8Array(32);
    for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
    return new PublicKey(arr).toString();
  }
}

export { AuddCheckoutConfig, CheckoutSession, PaymentStatus } from './types';
