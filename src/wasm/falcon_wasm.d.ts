/* tslint:disable */
/* eslint-disable */
export function init(): Promise<void>;
export function initSync(): void;
export function generate_seed(): number[];
export function keypair_from_seed(seed: Uint8Array | number[]): KeyPair;
export function seed_from_passphrase(passphrase: Uint8Array | number[], salt: Uint8Array | number[], iterations: number): number[];
export function keypair_from_passphrase(passphrase: Uint8Array | number[], salt: Uint8Array | number[], iterations: number): KeyPair;
export function derive_child_seed(master_seed: Uint8Array | number[], index: number): number[];
export function keypair_from_index(master_seed: Uint8Array | number[], index: number): KeyPair;

export class KeyPair {
  public_key: number[];
  secret_key: number[];
}

export function min_seed_length(): number;
export function public_key_length(): number;
export function secret_key_length(): number;

export default init;
