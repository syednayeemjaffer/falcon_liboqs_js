import { KeyPair } from '../types';
export declare const useFalcon: () => {
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
//# sourceMappingURL=useFalcon.d.ts.map