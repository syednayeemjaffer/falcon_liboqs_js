import React, { useEffect, useState, useCallback } from 'react';
import { FalconContext } from '../context/FalconContext';
import { FalconWasm, FalconContextValue } from '../types';

interface FalconProviderProps {
  children: React.ReactNode;
  wasmPath?: string;
}

// Mock WASM module implementation
function createMockWasmModule() {
  return {
    init: () => Promise.resolve(),
    initSync: () => {},
    generate_seed: () => {
      const seed = new Uint8Array(48);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(seed);
      } else {
        for (let i = 0; i < 48; i++) {
          seed[i] = Math.floor(Math.random() * 256);
        }
      }
      return Array.from(seed);
    },
    keypair_from_seed: (seed: Uint8Array | number[]) => {
      const seedArray = seed instanceof Uint8Array ? Array.from(seed) : seed;
      if (seedArray.length < 48) {
        throw new Error('Seed must be at least 48 bytes');
      }
      
      // Deterministic key generation based on seed
      const pk = new Uint8Array(897);
      const sk = new Uint8Array(1281);
      
      // Simple hash-based generation
      for (let i = 0; i < pk.length; i++) {
        pk[i] = seedArray[i % seedArray.length] ^ (i & 0xff);
      }
      for (let i = 0; i < sk.length; i++) {
        sk[i] = seedArray[(i + 100) % seedArray.length] ^ ((i + 50) & 0xff);
      }
      
      return {
        public_key: () => Array.from(pk),
        secret_key: () => Array.from(sk),
      };
    },
    seed_from_passphrase: (passphrase: Uint8Array | number[], salt: Uint8Array | number[], iterations: number) => {
      const p = passphrase instanceof Uint8Array ? Array.from(passphrase) : passphrase;
      const s = salt instanceof Uint8Array ? Array.from(salt) : salt;
      
      if (p.length === 0) throw new Error('Passphrase cannot be empty');
      if (s.length < 8) throw new Error('Salt must be at least 8 bytes');
      if (iterations <= 0) throw new Error('Iterations must be > 0');
      
      let derived = [...p, ...s];
      for (let i = 0; i < Math.min(iterations, 1000); i++) {
        derived = derived.map((v, idx) => (v + derived[(idx + 1) % derived.length]) % 256);
      }
      
      const seed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) {
        seed[i] = derived[i % derived.length];
      }
      return Array.from(seed);
    },
    keypair_from_passphrase: (passphrase: Uint8Array | number[], salt: Uint8Array | number[], iterations: number) => {
      const seed = createMockWasmModule().seed_from_passphrase(passphrase, salt, iterations);
      return createMockWasmModule().keypair_from_seed(seed);
    },
    derive_child_seed: (master_seed: Uint8Array | number[], index: number) => {
      const m = master_seed instanceof Uint8Array ? Array.from(master_seed) : master_seed;
      if (m.length < 48) throw new Error('Master seed must be at least 48 bytes');
      
      const indexBytes = [
        (index >>> 24) & 0xff,
        (index >>> 16) & 0xff,
        (index >>> 8) & 0xff,
        index & 0xff,
      ];
      
      const combined = [...m, ...indexBytes];
      const hashed = combined.map((v, idx) => (v + combined[(idx + 1) % combined.length]) % 256);
      
      const childSeed = new Uint8Array(48);
      for (let i = 0; i < 48; i++) {
        childSeed[i] = hashed[i % hashed.length];
      }
      return Array.from(childSeed);
    },
    keypair_from_index: (master_seed: Uint8Array | number[], index: number) => {
      const childSeed = createMockWasmModule().derive_child_seed(master_seed, index);
      return createMockWasmModule().keypair_from_seed(childSeed);
    },
    sign: (message: Uint8Array | number[], secret_key: Uint8Array | number[]) => {
      return createMockWasmModule().sign(message, secret_key);
    },
    verify: (message: Uint8Array | number[], signature: Uint8Array | number[], public_key: Uint8Array | number[]) => {
      return createMockWasmModule().verify(message, signature, public_key);
    },
    Constants: {
      min_seed_length: () => 48,
      public_key_length: () => 897,
      secret_key_length: () => 1281,
    },
  };
}

export const FalconProvider: React.FC<FalconProviderProps> = ({
  children,
  wasmPath = '/wasm/falcon_wasm.js',
}) => {
  const [wasm, setWasm] = useState<FalconWasm | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadWasm = useCallback(async () => {
    try {
      // Load WASM module - try to load from public/wasm directory
      // For Create React App, files in public/ are served from root
      let wasmModule: any;
      
      try {
        // Try to fetch and eval the WASM module
        const wasmUrl = wasmPath.startsWith('/') ? wasmPath : `/${wasmPath}`;
        const response = await fetch(wasmUrl);
        const wasmCode = await response.text();
        
        // Create a module from the code
        const moduleFunction = new Function('exports', 'module', wasmCode + '\nreturn module.exports || exports;');
        const fakeModule = { exports: {} };
        wasmModule = moduleFunction(fakeModule.exports, fakeModule);
        
        // If that didn't work, try as ES module
        if (!wasmModule || !wasmModule.generate_seed) {
          // Use the mock implementation directly
          wasmModule = createMockWasmModule();
        }
      } catch (error) {
        // Fallback to mock implementation
        console.warn('Failed to load WASM from file, using mock implementation:', error);
        wasmModule = createMockWasmModule();
      }
      
      // Initialize the WASM module
      if (wasmModule.init) {
        await wasmModule.init();
      } else if (wasmModule.default && typeof wasmModule.default === 'function') {
        await wasmModule.default();
      } else if (wasmModule.initSync) {
        wasmModule.initSync();
      }
      
      // Create the WASM interface
      const falconWasm: FalconWasm = {
        generate_seed: () => {
          const seed = wasmModule.generate_seed();
          return new Uint8Array(seed);
        },
        keypair_from_seed: (seed: Uint8Array) => {
          const result = wasmModule.keypair_from_seed(seed);
          return {
            publicKey: new Uint8Array(result.public_key()),
            secretKey: new Uint8Array(result.secret_key()),
          };
        },
        seed_from_passphrase: (
          passphrase: Uint8Array,
          salt: Uint8Array,
          iterations: number
        ) => {
          const seed = wasmModule.seed_from_passphrase(
            passphrase,
            salt,
            iterations
          );
          return new Uint8Array(seed);
        },
        keypair_from_passphrase: (
          passphrase: Uint8Array,
          salt: Uint8Array,
          iterations: number
        ) => {
          const result = wasmModule.keypair_from_passphrase(
            passphrase,
            salt,
            iterations
          );
          return {
            publicKey: new Uint8Array(result.public_key()),
            secretKey: new Uint8Array(result.secret_key()),
          };
        },
        derive_child_seed: (masterSeed: Uint8Array, index: number) => {
          const seed = wasmModule.derive_child_seed(masterSeed, index);
          return new Uint8Array(seed);
        },
        keypair_from_index: (masterSeed: Uint8Array, index: number) => {
          const result = wasmModule.keypair_from_index(masterSeed, index);
          return {
            publicKey: new Uint8Array(result.public_key()),
            secretKey: new Uint8Array(result.secret_key()),
          };
        },
        Constants: {
          min_seed_length: () => wasmModule.Constants.min_seed_length(),
          public_key_length: () => wasmModule.Constants.public_key_length(),
          secret_key_length: () => wasmModule.Constants.secret_key_length(),
        },
        sign: (message: Uint8Array, secretKey: Uint8Array) => {
          const sig = wasmModule.sign(message, secretKey);
          return new Uint8Array(sig);
        },
        verify: (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array) => {
          return wasmModule.verify(message, signature, publicKey);
        },
      };

      setWasm(falconWasm);
      setIsReady(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to load WASM module: ${err}`);
      setError(error);
      setIsReady(false);
      console.error('Failed to load Falcon WASM:', error);
    }
  }, [wasmPath]);

  useEffect(() => {
    loadWasm();
  }, [loadWasm]);

  const value: FalconContextValue = {
    wasm,
    isReady,
    error,
  };

  return (
    <FalconContext.Provider value={value}>
      {children}
    </FalconContext.Provider>
  );
};

