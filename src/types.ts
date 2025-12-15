/**
 * Key pair structure
 */
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Falcon WASM module interface
 */
export interface FalconWasm {
  generate_seed: () => Uint8Array;
  keypair_from_seed: (seed: Uint8Array) => KeyPair;
  seed_from_passphrase: (
    passphrase: Uint8Array,
    salt: Uint8Array,
    iterations: number
  ) => Uint8Array;
  keypair_from_passphrase: (
    passphrase: Uint8Array,
    salt: Uint8Array,
    iterations: number
  ) => KeyPair;
  derive_child_seed: (masterSeed: Uint8Array, index: number) => Uint8Array;
  keypair_from_index: (masterSeed: Uint8Array, index: number) => KeyPair;
  Constants: {
    min_seed_length: () => number;
    public_key_length: () => number;
    secret_key_length: () => number;
  };
  sign: (message: Uint8Array, secretKey: Uint8Array) => Uint8Array;
  verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => boolean;
}

/**
 * Falcon context value
 */
export interface FalconContextValue {
  wasm: FalconWasm | null;
  isReady: boolean;
  error: Error | null;
}

