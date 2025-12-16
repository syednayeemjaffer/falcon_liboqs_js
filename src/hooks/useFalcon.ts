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

  const sign = useCallback(
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.sign(message, secretKey);
    },
    [wasm, isReady]
  );

  const verify = useCallback(
    (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean => {
      if (!wasm || !isReady) {
        throw new Error('Falcon WASM is not ready');
      }
      return wasm.verify(message, signature, publicKey);
    },
    [wasm, isReady]
  );

  const getConstants = useCallback(() => {
    if (!wasm || !isReady) {
      throw new Error('Falcon WASM is not ready');
    }
    return {
      minSeedLength: wasm.min_seed_length(),
      publicKeyLength: wasm.public_key_length(),
      secretKeyLength: wasm.secret_key_length(),
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
    sign,
    verify,
    getConstants,
  };
};

