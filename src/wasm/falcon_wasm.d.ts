export function init(): Promise<void>;
export function initSync(): void;
export function generate_seed(): number[];
export function keypair_from_seed(seed: Uint8Array | number[]): KeyPair;
export function sign(message: Uint8Array | number[], secret_key: Uint8Array | number[]): number[];
export function verify(message: Uint8Array | number[], signature: Uint8Array | number[], public_key: Uint8Array | number[]): boolean;
export function min_seed_length(): number;
export function public_key_length(): number;
export function secret_key_length(): number;
export function signature_length(): number;

export class KeyPair {
  public_key: number[];
  secret_key: number[];
}

export default init;
