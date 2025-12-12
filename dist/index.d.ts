import React from 'react';

/**
 * Key pair structure
 */
interface KeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}
/**
 * Falcon WASM module interface
 */
interface FalconWasm {
    generate_seed: () => Uint8Array;
    keypair_from_seed: (seed: Uint8Array) => KeyPair;
    seed_from_passphrase: (passphrase: Uint8Array, salt: Uint8Array, iterations: number) => Uint8Array;
    keypair_from_passphrase: (passphrase: Uint8Array, salt: Uint8Array, iterations: number) => KeyPair;
    derive_child_seed: (masterSeed: Uint8Array, index: number) => Uint8Array;
    keypair_from_index: (masterSeed: Uint8Array, index: number) => KeyPair;
    Constants: {
        min_seed_length: () => number;
        public_key_length: () => number;
        secret_key_length: () => number;
    };
}
/**
 * Falcon context value
 */
interface FalconContextValue {
    wasm: FalconWasm | null;
    isReady: boolean;
    error: Error | null;
}

declare const useFalcon: () => {
    isReady: boolean;
    error: Error | null;
    generateSeed: () => Uint8Array;
    keypairFromSeed: (seed: Uint8Array) => KeyPair;
    seedFromPassphrase: (passphrase: Uint8Array, salt: Uint8Array, iterations: number) => Uint8Array;
    keypairFromPassphrase: (passphrase: Uint8Array, salt: Uint8Array, iterations: number) => KeyPair;
    deriveChildSeed: (masterSeed: Uint8Array, index: number) => Uint8Array;
    keypairFromIndex: (masterSeed: Uint8Array, index: number) => KeyPair;
    getConstants: () => {
        minSeedLength: number;
        publicKeyLength: number;
        secretKeyLength: number;
    };
};

interface FalconProviderProps {
    children: React.ReactNode;
    wasmPath?: string;
}
declare const FalconProvider: React.FC<FalconProviderProps>;

declare const FalconContext: React.Context<FalconContextValue | null>;

/**
 * Convert Uint8Array to hex string
 */
declare function uint8ArrayToHex(bytes: Uint8Array): string;
/**
 * Convert hex string to Uint8Array
 */
declare function hexToUint8Array(hex: string): Uint8Array;
/**
 * Convert Uint8Array to base64 string
 */
declare function uint8ArrayToBase64(bytes: Uint8Array): string;
/**
 * Convert base64 string to Uint8Array
 */
declare function base64ToUint8Array(base64: string): Uint8Array;

export { FalconContext, FalconProvider, base64ToUint8Array, hexToUint8Array, uint8ArrayToBase64, uint8ArrayToHex, useFalcon };
export type { FalconContextValue, FalconWasm, KeyPair };
