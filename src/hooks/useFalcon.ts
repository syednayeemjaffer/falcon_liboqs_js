import { useCallback } from 'react';
import { useFalconContext } from '../context/FalconContext';
import { KeyPair } from '../types';

export const useFalcon = () => {
  const { wasm, isReady, error } = useFalconContext();

  const generateSeed = useCallback((): Uint8Array => {
    if (!wasm || !isReady) {
      throw new Error('Falcon WASM is not ready');
    }
    return wasm.generate_seed();
  }, [wasm, isReady]);

  const keypairFromSeed = useCallback(
    (seed: Uint8Array): KeyPair => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.keypair_from_seed(seed);
    },
    [wasm, isReady]
  );

  const seedFromPassphrase = useCallback(
    (passphrase: Uint8Array, salt: Uint8Array, iterations: number): Uint8Array => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.seed_from_passphrase(passphrase, salt, iterations);
    },
    [wasm, isReady]
  );

  const keypairFromPassphrase = useCallback(
    (
      passphrase: Uint8Array,
      salt: Uint8Array,
      iterations: number
    ): KeyPair => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.keypair_from_passphrase(passphrase, salt, iterations);
    },
    [wasm, isReady]
  );

  const deriveChildSeed = useCallback(
    (masterSeed: Uint8Array, index: number): Uint8Array => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.derive_child_seed(masterSeed, index);
    },
    [wasm, isReady]
  );

  const keypairFromIndex = useCallback(
    (masterSeed: Uint8Array, index: number): KeyPair => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.keypair_from_index(masterSeed, index);
    },
    [wasm, isReady]
  );

  const getConstants = useCallback(() => {
    if (!wasm || !isReady) {
      throw new Error('Falcon WASM is not ready');
    }
    return {
      minSeedLength: wasm.Constants.min_seed_length(),
      publicKeyLength: wasm.Constants.public_key_length(),
      secretKeyLength: wasm.Constants.secret_key_length(),
    };
  }, [wasm, isReady]);

  return {
    isReady,
    error,
    generateSeed,
    keypairFromSeed,
    seedFromPassphrase,
    keypairFromPassphrase,
    deriveChildSeed,
    keypairFromIndex,
    getConstants,
  };
};

