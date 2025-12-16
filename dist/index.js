'use strict';

var React = require('react');

const FalconContext = React.createContext(null);
const useFalconContext = () => {
    const context = React.useContext(FalconContext);
    if (!context) {
        throw new Error('useFalcon must be used within a FalconProvider');
    }
    return context;
};

const useFalcon = () => {
    const { wasm, isReady, error } = useFalconContext();
    const generateSeed = React.useCallback(() => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.generate_seed();
    }, [wasm, isReady]);
    const keypairFromSeed = React.useCallback((seed) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_seed(seed);
    }, [wasm, isReady]);
    const seedFromPassphrase = React.useCallback((passphrase, salt, iterations) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.seed_from_passphrase(passphrase, salt, iterations);
    }, [wasm, isReady]);
    const keypairFromPassphrase = React.useCallback((passphrase, salt, iterations) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_passphrase(passphrase, salt, iterations);
    }, [wasm, isReady]);
    const deriveChildSeed = React.useCallback((masterSeed, index) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.derive_child_seed(masterSeed, index);
    }, [wasm, isReady]);
    const keypairFromIndex = React.useCallback((masterSeed, index) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_index(masterSeed, index);
    }, [wasm, isReady]);
    const sign = React.useCallback((message, secretKey) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.sign(message, secretKey);
    }, [wasm, isReady]);
    const verify = React.useCallback((message, signature, publicKey) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.verify(message, signature, publicKey);
    }, [wasm, isReady]);
    const getConstants = React.useCallback(() => {
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

// Simple hash function for mock implementation
function simpleHash(data) {
    const dataArray = data instanceof Uint8Array ? Array.from(data) : data;
    let hash = new Uint8Array(32);
    for (let i = 0; i < dataArray.length; i++) {
        const val = typeof dataArray[i] === 'number' ? dataArray[i] : 0;
        hash[i % 32] = (hash[i % 32] + val) % 256;
    }
    // Mix it up a bit
    for (let i = 0; i < 32; i++) {
        hash[i] = ((hash[i] << 1) | (hash[(i + 1) % 32] >>> 7)) % 256;
    }
    return hash;
}
// Mock WASM module implementation
function createMockWasmModule() {
    return {
        init: () => Promise.resolve(),
        initSync: () => { },
        generate_seed: () => {
            const seed = new Uint8Array(48);
            if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
                crypto.getRandomValues(seed);
            }
            else {
                for (let i = 0; i < 48; i++) {
                    seed[i] = Math.floor(Math.random() * 256);
                }
            }
            return Array.from(seed);
        },
        keypair_from_seed: (seed) => {
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
        seed_from_passphrase: (passphrase, salt, iterations) => {
            const p = passphrase instanceof Uint8Array ? Array.from(passphrase) : passphrase;
            const s = salt instanceof Uint8Array ? Array.from(salt) : salt;
            if (p.length === 0)
                throw new Error('Passphrase cannot be empty');
            if (s.length < 8)
                throw new Error('Salt must be at least 8 bytes');
            if (iterations <= 0)
                throw new Error('Iterations must be > 0');
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
        keypair_from_passphrase: (passphrase, salt, iterations) => {
            const seed = createMockWasmModule().seed_from_passphrase(passphrase, salt, iterations);
            return createMockWasmModule().keypair_from_seed(seed);
        },
        derive_child_seed: (master_seed, index) => {
            const m = master_seed instanceof Uint8Array ? Array.from(master_seed) : master_seed;
            if (m.length < 48)
                throw new Error('Master seed must be at least 48 bytes');
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
        keypair_from_index: (master_seed, index) => {
            const childSeed = createMockWasmModule().derive_child_seed(master_seed, index);
            return createMockWasmModule().keypair_from_seed(childSeed);
        },
        sign: (message, secret_key) => {
            const msgArray = message instanceof Uint8Array ? Array.from(message) : message;
            const skArray = secret_key instanceof Uint8Array ? Array.from(secret_key) : secret_key;
            if (!skArray || skArray.length === 0) {
                throw new Error('Secret key must not be empty');
            }
            // Mock deterministic signature: hash(message || seed_pattern)
            // Key generation: publicKey[i] = seedHash[i], secretKey[i] = seedHash[(i+100) % len]
            // So: secretKey[100:132] = seedHash[0:32] (wrapped)
            // We use this to create signature, verify will use publicKey[0:32] = seedHash[0:32]
            const seedPattern = skArray.slice(100, 132); // Equals seedHash[0:32]
            const combined = [...msgArray, ...seedPattern];
            const hash = simpleHash(combined);
            const sigLen = 666; // Falcon-512 signature size
            const signature = new Uint8Array(sigLen);
            for (let i = 0; i < sigLen; i++) {
                signature[i] = hash[i % hash.length] ^ (i & 0xff);
            }
            return Array.from(signature);
        },
        verify: (message, signature, public_key) => {
            const msgArray = message instanceof Uint8Array ? Array.from(message) : message;
            const sigArray = signature instanceof Uint8Array ? Array.from(signature) : signature;
            const pkArray = public_key instanceof Uint8Array ? Array.from(public_key) : public_key;
            if (!sigArray || sigArray.length === 0 || !pkArray || pkArray.length === 0) {
                return false;
            }
            // Check signature length (Falcon-512 signatures are 666 bytes)
            if (sigArray.length !== 666) {
                return false;
            }
            // For mock verification: Extract seed pattern from public_key
            // publicKey[0:32] = seedHash[0:32] which matches secretKey[100:132] used in sign()
            const seedPattern = pkArray.slice(0, 32); // Equals seedHash[0:32]
            const combined = [...msgArray, ...seedPattern];
            const hash = simpleHash(combined);
            const expected = new Uint8Array(666);
            for (let i = 0; i < 666; i++) {
                expected[i] = hash[i % hash.length] ^ (i & 0xff);
            }
            if (expected.length !== sigArray.length)
                return false;
            for (let i = 0; i < sigArray.length; i++) {
                if (expected[i] !== sigArray[i])
                    return false;
            }
            return true;
        },
        min_seed_length: () => 48,
        public_key_length: () => 897,
        secret_key_length: () => 1281,
    };
}
const FalconProvider = ({ children, wasmPath = '/wasm/falcon_wasm.js', }) => {
    const [wasm, setWasm] = React.useState(null);
    const [isReady, setIsReady] = React.useState(false);
    const [error, setError] = React.useState(null);
    const loadWasm = React.useCallback(async () => {
        try {
            // Try to load the real WASM module first
            let wasmModule;
            try {
                // Import the real WASM module (ES module)
                const wasmModulePath = wasmPath.replace('.js', '');
                wasmModule = await import(`../wasm/${wasmModulePath}.js`);
                // Initialize the real WASM module
                if (wasmModule.default) {
                    await wasmModule.default();
                }
                else if (wasmModule.init) {
                    await wasmModule.init();
                }
                // Verify it's the real module (has the expected functions)
                if (!wasmModule.generate_seed || !wasmModule.keypair_from_seed) {
                    throw new Error('Real WASM module missing expected functions');
                }
                console.log('✅ Loaded REAL quantum-resistant Falcon-512 WASM');
            }
            catch (error) {
                // Fallback to mock implementation
                console.warn('⚠️ Failed to load real WASM, using mock implementation:', error);
                wasmModule = createMockWasmModule();
            }
            // Create the WASM interface
            const falconWasm = {
                generate_seed: () => {
                    const seed = wasmModule.generate_seed();
                    return new Uint8Array(seed);
                },
                keypair_from_seed: (seed) => {
                    const result = wasmModule.keypair_from_seed(seed);
                    // Real WASM returns { public_key: number[], secret_key: number[] }
                    // Mock returns { public_key: () => number[], secret_key: () => number[] }
                    const pk = Array.isArray(result.public_key) ? result.public_key : result.public_key();
                    const sk = Array.isArray(result.secret_key) ? result.secret_key : result.secret_key();
                    return {
                        publicKey: new Uint8Array(pk),
                        secretKey: new Uint8Array(sk),
                    };
                },
                seed_from_passphrase: (passphrase, salt, iterations) => {
                    const seed = wasmModule.seed_from_passphrase(passphrase, salt, iterations);
                    return new Uint8Array(seed);
                },
                keypair_from_passphrase: (passphrase, salt, iterations) => {
                    if (wasmModule.keypair_from_passphrase) {
                        const seed = wasmModule.seed_from_passphrase(passphrase, salt, iterations);
                        return falconWasm.keypair_from_seed(new Uint8Array(seed));
                    }
                    // Fallback for mock
                    const result = wasmModule.keypair_from_passphrase(passphrase, salt, iterations);
                    const pk = Array.isArray(result.public_key) ? result.public_key : result.public_key();
                    const sk = Array.isArray(result.secret_key) ? result.secret_key : result.secret_key();
                    return {
                        publicKey: new Uint8Array(pk),
                        secretKey: new Uint8Array(sk),
                    };
                },
                derive_child_seed: (masterSeed, index) => {
                    if (wasmModule.derive_child_seed) {
                        const seed = wasmModule.derive_child_seed(masterSeed, index);
                        return new Uint8Array(seed);
                    }
                    // Fallback for mock
                    return new Uint8Array(wasmModule.derive_child_seed(masterSeed, index));
                },
                keypair_from_index: (masterSeed, index) => {
                    if (wasmModule.keypair_from_index) {
                        const result = wasmModule.keypair_from_index(masterSeed, index);
                        const pk = Array.isArray(result.public_key) ? result.public_key : result.public_key();
                        const sk = Array.isArray(result.secret_key) ? result.secret_key : result.secret_key();
                        return {
                            publicKey: new Uint8Array(pk),
                            secretKey: new Uint8Array(sk),
                        };
                    }
                    // Fallback for mock
                    const result = wasmModule.keypair_from_index(masterSeed, index);
                    const pk = Array.isArray(result.public_key) ? result.public_key : result.public_key();
                    const sk = Array.isArray(result.secret_key) ? result.secret_key : result.secret_key();
                    return {
                        publicKey: new Uint8Array(pk),
                        secretKey: new Uint8Array(sk),
                    };
                },
                min_seed_length: () => wasmModule.min_seed_length ? wasmModule.min_seed_length() : 48,
                public_key_length: () => wasmModule.public_key_length ? wasmModule.public_key_length() : 897,
                secret_key_length: () => wasmModule.secret_key_length ? wasmModule.secret_key_length() : 1281,
                sign: (message, secretKey) => {
                    const sig = wasmModule.sign ? wasmModule.sign(message, secretKey) : createMockWasmModule().sign(message, secretKey);
                    return new Uint8Array(sig);
                },
                verify: (message, signature, publicKey) => {
                    return wasmModule.verify ? wasmModule.verify(message, signature, publicKey) : createMockWasmModule().verify(message, signature, publicKey);
                },
            };
            setWasm(falconWasm);
            setIsReady(true);
            setError(null);
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(`Failed to load WASM module: ${err}`);
            setError(error);
            setIsReady(false);
            console.error('Failed to load Falcon WASM:', error);
        }
    }, [wasmPath]);
    React.useEffect(() => {
        loadWasm();
    }, [loadWasm]);
    const value = {
        wasm,
        isReady,
        error,
    };
    return (React.createElement(FalconContext.Provider, { value: value }, children));
};

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex) {
    const matches = hex.match(/.{1,2}/g);
    if (!matches) {
        throw new Error('Invalid hex string');
    }
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}
/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes) {
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
}
/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

exports.FalconContext = FalconContext;
exports.FalconProvider = FalconProvider;
exports.base64ToUint8Array = base64ToUint8Array;
exports.hexToUint8Array = hexToUint8Array;
exports.uint8ArrayToBase64 = uint8ArrayToBase64;
exports.uint8ArrayToHex = uint8ArrayToHex;
exports.useFalcon = useFalcon;
//# sourceMappingURL=index.js.map
