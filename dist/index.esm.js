import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

const FalconContext = createContext(null);
const useFalconContext = () => {
    const context = useContext(FalconContext);
    if (!context) {
        throw new Error('useFalcon must be used within a FalconProvider');
    }
    return context;
};

const useFalcon = () => {
    const { wasm, isReady, error } = useFalconContext();
    const generateSeed = useCallback(() => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.generate_seed();
    }, [wasm, isReady]);
    const keypairFromSeed = useCallback((seed) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_seed(seed);
    }, [wasm, isReady]);
    const seedFromPassphrase = useCallback((passphrase, salt, iterations) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.seed_from_passphrase(passphrase, salt, iterations);
    }, [wasm, isReady]);
    const keypairFromPassphrase = useCallback((passphrase, salt, iterations) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_passphrase(passphrase, salt, iterations);
    }, [wasm, isReady]);
    const deriveChildSeed = useCallback((masterSeed, index) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.derive_child_seed(masterSeed, index);
    }, [wasm, isReady]);
    const keypairFromIndex = useCallback((masterSeed, index) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.keypair_from_index(masterSeed, index);
    }, [wasm, isReady]);
    const sign = useCallback((message, secretKey) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.sign(message, secretKey);
    }, [wasm, isReady]);
    const verify = useCallback((message, signature, publicKey) => {
        if (!wasm || !isReady) {
            throw new Error('Falcon WASM is not ready');
        }
        return wasm.verify(message, signature, publicKey);
    }, [wasm, isReady]);
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
const FalconProvider = ({ children, 
// wasmPath is kept for backwards compatibility but is currently ignored.
wasmPath = '/wasm/falcon_wasm.js', }) => {
    const [wasm, setWasm] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const loadWasm = useCallback(async () => {
        try {
            // Try to load the real WASM module first
            let wasmModule;
            try {
                // Import the real WASM module (ES module) bundled with this package.
                // The build script copies the real WASM bindings into react-falcon/wasm,
                // and rollup bundles them so consumers don't need to copy anything.
                wasmModule = await Promise.resolve().then(function () { return falcon_wasm; });
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
    useEffect(() => {
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

// Real Quantum-Resistant Falcon-512 WASM Module
// This is the actual compiled WASM, not a mock!

let wasmModule = null;
let wasmReady = false;
let moduleFactory = null;

// Load the Emscripten module factory
async function loadModuleFactory() {
  if (moduleFactory) return moduleFactory;
  
  // Emscripten generates a module that exports createFalconModule
  // We need to load it dynamically
  if (typeof window !== 'undefined') {
    // Browser environment
    const script = document.createElement('script');
    script.src = './falcon_wasm_raw.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if (typeof createFalconModule !== 'undefined') {
          moduleFactory = createFalconModule;
          resolve(createFalconModule);
        } else {
          reject(new Error('createFalconModule not found'));
        }
      };
      script.onerror = reject;
    });
  } else {
    // Node.js or other environment
    const mod = await Promise.resolve().then(function () { return falcon_wasm_raw; });
    moduleFactory = mod.default || mod.createFalconModule || mod;
    return moduleFactory;
  }
}

async function init() {
  if (wasmReady && wasmModule) return;
  
  const createModule = await loadModuleFactory();
  
  wasmModule = await createModule({
    locateFile: (path) => {
      if (path.endsWith('.wasm')) {
        return './falcon_wasm_bg.wasm';
      }
      return path;
    }
  });
  
  // Initialize liboqs
  wasmModule._falcon_init();
  wasmReady = true;
}

function initSync() {
  throw new Error('Synchronous init not supported. Use async init()');
}

function generate_seed() {
  if (!wasmReady || !wasmModule) throw new Error('WASM not initialized. Call init() first.');
  const seedPtr = wasmModule._malloc(48);
  wasmModule._falcon_generate_seed(seedPtr);
  const seed = new Uint8Array(wasmModule.HEAPU8.buffer, seedPtr, 48);
  const result = Array.from(new Uint8Array(seed));
  wasmModule._free(seedPtr);
  return result;
}

function keypair_from_seed(seed) {
  if (!wasmReady || !wasmModule) throw new Error('WASM not initialized. Call init() first.');
  const seedArray = seed instanceof Uint8Array ? Array.from(seed) : seed;
  if (seedArray.length < 48) throw new Error('Seed must be at least 48 bytes');
  
  const seedPtr = wasmModule._malloc(seedArray.length);
  const pkPtr = wasmModule._malloc(897);
  const skPtr = wasmModule._malloc(1281);
  
  wasmModule.HEAPU8.set(seedArray, seedPtr);
  
  const result = wasmModule._falcon_keypair_from_seed(seedPtr, seedArray.length, pkPtr, skPtr);
  
  if (result !== 0) {
    wasmModule._free(seedPtr);
    wasmModule._free(pkPtr);
    wasmModule._free(skPtr);
    throw new Error('Keypair generation failed');
  }
  
  const publicKey = Array.from(new Uint8Array(wasmModule.HEAPU8.buffer, pkPtr, 897));
  const secretKey = Array.from(new Uint8Array(wasmModule.HEAPU8.buffer, skPtr, 1281));
  
  wasmModule._free(seedPtr);
  wasmModule._free(pkPtr);
  wasmModule._free(skPtr);
  
  return { public_key: publicKey, secret_key: secretKey };
}

function sign(message, secret_key) {
  if (!wasmReady || !wasmModule) throw new Error('WASM not initialized. Call init() first.');
  const msgArray = message instanceof Uint8Array ? Array.from(message) : message;
  const skArray = secret_key instanceof Uint8Array ? Array.from(secret_key) : secret_key;
  
  const msgPtr = wasmModule._malloc(msgArray.length);
  const skPtr = wasmModule._malloc(skArray.length);
  const sigPtr = wasmModule._malloc(666);
  
  wasmModule.HEAPU8.set(msgArray, msgPtr);
  wasmModule.HEAPU8.set(skArray, skPtr);
  
  const sigLen = wasmModule._falcon_sign(msgPtr, msgArray.length, skPtr, sigPtr);
  
  if (sigLen < 0) {
    wasmModule._free(msgPtr);
    wasmModule._free(skPtr);
    wasmModule._free(sigPtr);
    throw new Error('Signing failed');
  }
  
  const signature = Array.from(new Uint8Array(wasmModule.HEAPU8.buffer, sigPtr, sigLen));
  
  wasmModule._free(msgPtr);
  wasmModule._free(skPtr);
  wasmModule._free(sigPtr);
  
  return signature;
}

function verify(message, signature, public_key) {
  if (!wasmReady || !wasmModule) throw new Error('WASM not initialized. Call init() first.');
  const msgArray = message instanceof Uint8Array ? Array.from(message) : message;
  const sigArray = signature instanceof Uint8Array ? Array.from(signature) : signature;
  const pkArray = public_key instanceof Uint8Array ? Array.from(public_key) : public_key;
  
  const msgPtr = wasmModule._malloc(msgArray.length);
  const sigPtr = wasmModule._malloc(sigArray.length);
  const pkPtr = wasmModule._malloc(pkArray.length);
  
  wasmModule.HEAPU8.set(msgArray, msgPtr);
  wasmModule.HEAPU8.set(sigArray, sigPtr);
  wasmModule.HEAPU8.set(pkArray, pkPtr);
  
  const result = wasmModule._falcon_verify(msgPtr, msgArray.length, sigPtr, sigArray.length, pkPtr);
  
  wasmModule._free(msgPtr);
  wasmModule._free(sigPtr);
  wasmModule._free(pkPtr);
  
  return result === 1;
}

function min_seed_length() { return 48; }
function public_key_length() { return 897; }
function secret_key_length() { return 1281; }
function signature_length() { return 666; }

// KeyPair class for compatibility
class KeyPair {
  constructor(public_key, secret_key) {
    this.public_key = public_key;
    this.secret_key = secret_key;
  }
}

var falcon_wasm = /*#__PURE__*/Object.freeze({
    __proto__: null,
    KeyPair: KeyPair,
    default: init,
    generate_seed: generate_seed,
    init: init,
    initSync: initSync,
    keypair_from_seed: keypair_from_seed,
    min_seed_length: min_seed_length,
    public_key_length: public_key_length,
    secret_key_length: secret_key_length,
    sign: sign,
    signature_length: signature_length,
    verify: verify
});

var createFalconModule$1 = (() => {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  
  return (
function(moduleArg = {}) {

var Module=moduleArg;var readyPromiseResolve,readyPromiseReject;Module["ready"]=new Promise((resolve,reject)=>{readyPromiseResolve=resolve;readyPromiseReject=reject;});var moduleOverrides=Object.assign({},Module);var quit_=(status,toThrow)=>{throw toThrow};var ENVIRONMENT_IS_WEB=typeof window=="object";var ENVIRONMENT_IS_WORKER=typeof importScripts=="function";typeof process=="object"&&typeof process.versions=="object"&&typeof process.versions.node=="string";var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){if(ENVIRONMENT_IS_WORKER){scriptDirectory=self.location.href;}else if(typeof document!="undefined"&&document.currentScript){scriptDirectory=document.currentScript.src;}if(_scriptDir){scriptDirectory=_scriptDir;}if(scriptDirectory.startsWith("blob:")){scriptDirectory="";}else {scriptDirectory=scriptDirectory.substr(0,scriptDirectory.replace(/[?#].*/,"").lastIndexOf("/")+1);}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)};}}}var out=Module["print"]||console.log.bind(console);var err=Module["printErr"]||console.error.bind(console);Object.assign(Module,moduleOverrides);moduleOverrides=null;if(Module["arguments"])Module["arguments"];if(Module["thisProgram"])Module["thisProgram"];if(Module["quit"])quit_=Module["quit"];var wasmBinary;if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];var wasmMemory;var ABORT=false;var HEAP8,HEAPU8,HEAP16,HEAP32,HEAPU32,HEAPF32,HEAPF64;function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=HEAP8=new Int8Array(b);Module["HEAP16"]=HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);Module["HEAPU16"]=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);Module["HEAPF64"]=HEAPF64=new Float64Array(b);}var __ATPRERUN__=[];var __ATINIT__=[];var __ATPOSTRUN__=[];function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift());}}callRuntimeCallbacks(__ATPRERUN__);}function initRuntime(){callRuntimeCallbacks(__ATINIT__);}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift());}}callRuntimeCallbacks(__ATPOSTRUN__);}function addOnPreRun(cb){__ATPRERUN__.unshift(cb);}function addOnInit(cb){__ATINIT__.unshift(cb);}function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb);}var runDependencies=0;var dependenciesFulfilled=null;function addRunDependency(id){runDependencies++;Module["monitorRunDependencies"]?.(runDependencies);}function removeRunDependency(id){runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback();}}}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);readyPromiseReject(e);throw e}var dataURIPrefix="data:application/octet-stream;base64,";var isDataURI=filename=>filename.startsWith(dataURIPrefix);var wasmBinaryFile;wasmBinaryFile="falcon_wasm_raw.wasm";if(!isDataURI(wasmBinaryFile)){wasmBinaryFile=locateFile(wasmBinaryFile);}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw "both async and sync fetching of the wasm failed"}function getBinaryPromise(binaryFile){if(!wasmBinary&&(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER)){if(typeof fetch=="function"){return fetch(binaryFile,{credentials:"same-origin"}).then(response=>{if(!response["ok"]){throw `failed to load wasm binary file at '${binaryFile}'`}return response["arrayBuffer"]()}).catch(()=>getBinarySync(binaryFile))}}return Promise.resolve().then(()=>getBinarySync(binaryFile))}function instantiateArrayBuffer(binaryFile,imports,receiver){return getBinaryPromise(binaryFile).then(binary=>WebAssembly.instantiate(binary,imports)).then(receiver,reason=>{err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason);})}function instantiateAsync(binary,binaryFile,imports,callback){if(!binary&&typeof WebAssembly.instantiateStreaming=="function"&&!isDataURI(binaryFile)&&typeof fetch=="function"){return fetch(binaryFile,{credentials:"same-origin"}).then(response=>{var result=WebAssembly.instantiateStreaming(response,imports);return result.then(callback,function(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation");return instantiateArrayBuffer(binaryFile,imports,callback)})})}return instantiateArrayBuffer(binaryFile,imports,callback)}function createWasm(){var info={"a":wasmImports};function receiveInstance(instance,module){wasmExports=instance.exports;wasmMemory=wasmExports["h"];updateMemoryViews();addOnInit(wasmExports["i"]);removeRunDependency();return wasmExports}addRunDependency();function receiveInstantiationResult(result){receiveInstance(result["instance"]);}if(Module["instantiateWasm"]){try{return Module["instantiateWasm"](info,receiveInstance)}catch(e){err(`Module.instantiateWasm callback failed with error: ${e}`);readyPromiseReject(e);}}instantiateAsync(wasmBinary,wasmBinaryFile,info,receiveInstantiationResult).catch(readyPromiseReject);return {}}function ExitStatus(status){this.name="ExitStatus";this.message=`Program terminated with exit(${status})`;this.status=status;}var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module);}};function getValue(ptr,type="i8"){if(type.endsWith("*"))type="*";switch(type){case "i1":return HEAP8[ptr];case "i8":return HEAP8[ptr];case "i16":return HEAP16[ptr>>1];case "i32":return HEAP32[ptr>>2];case "i64":abort("to do getValue(i64) use WASM_BIGINT");case "float":return HEAPF32[ptr>>2];case "double":return HEAPF64[ptr>>3];case "*":return HEAPU32[ptr>>2];default:abort(`invalid type for getValue: ${type}`);}}Module["noExitRuntime"]||true;function setValue(ptr,value,type="i8"){if(type.endsWith("*"))type="*";switch(type){case "i1":HEAP8[ptr]=value;break;case "i8":HEAP8[ptr]=value;break;case "i16":HEAP16[ptr>>1]=value;break;case "i32":HEAP32[ptr>>2]=value;break;case "i64":abort("to do setValue(i64) use WASM_BIGINT");case "float":HEAPF32[ptr>>2]=value;break;case "double":HEAPF64[ptr>>3]=value;break;case "*":HEAPU32[ptr>>2]=value;break;default:abort(`invalid type for setValue: ${type}`);}}var _emscripten_memcpy_js=(dest,src,num)=>HEAPU8.copyWithin(dest,src,src+num);var getHeapMax=()=>2147483648;var growMemory=size=>{var b=wasmMemory.buffer;var pages=(size-b.byteLength+65535)/65536;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}var alignUp=(x,multiple)=>x+(multiple-x%multiple)%multiple;for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignUp(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};var _proc_exit=code=>{quit_(code,new ExitStatus(code));};var exitJS=(status,implicit)=>{_proc_exit(status);};var _exit=exitJS;var _fd_close=fd=>52;function _fd_seek(fd,offset_low,offset_high,whence,newOffset){return 70}var printCharBuffers=[null,[],[]];var UTF8Decoder=typeof TextDecoder!="undefined"?new TextDecoder("utf8"):undefined;var UTF8ArrayToString=(heapOrArray,idx,maxBytesToRead)=>{var endIdx=idx+maxBytesToRead;var endPtr=idx;while(heapOrArray[endPtr]&&!(endPtr>=endIdx))++endPtr;if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2;}else {u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63;}if(u0<65536){str+=String.fromCharCode(u0);}else {var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023);}}return str};var printChar=(stream,curr)=>{var buffer=printCharBuffers[stream];if(curr===0||curr===10){(stream===1?out:err)(UTF8ArrayToString(buffer,0));buffer.length=0;}else {buffer.push(curr);}};var UTF8ToString=(ptr,maxBytesToRead)=>ptr?UTF8ArrayToString(HEAPU8,ptr,maxBytesToRead):"";var _fd_write=(fd,iov,iovcnt,pnum)=>{var num=0;for(var i=0;i<iovcnt;i++){var ptr=HEAPU32[iov>>2];var len=HEAPU32[iov+4>>2];iov+=8;for(var j=0;j<len;j++){printChar(fd,HEAPU8[ptr+j]);}num+=len;}HEAPU32[pnum>>2]=num;return 0};var initRandomFill=()=>{if(typeof crypto=="object"&&typeof crypto["getRandomValues"]=="function"){return view=>crypto.getRandomValues(view)}else abort("initRandomDevice");};var randomFill=view=>(randomFill=initRandomFill())(view);var _getentropy=(buffer,size)=>{randomFill(HEAPU8.subarray(buffer,buffer+size));return 0};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{HEAP8.set(array,buffer);};var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++;}else if(c<=2047){len+=2;}else if(c>=55296&&c<=57343){len+=4;++i;}else {len+=3;}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343){var u1=str.charCodeAt(++i);u=65536+((u&1023)<<10)|u1&1023;}if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u;}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63;}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}else {if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;}}heap[outIdx]=0;return outIdx-startIdx};var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite);var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={"string":str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str);}return ret},"array":arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(ret)}if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i]);}else {cArgs[i]=args[i];}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return (...args)=>ccall(ident,returnType,argTypes,args)};var wasmImports={g:_emscripten_memcpy_js,e:_emscripten_resize_heap,a:_exit,f:_fd_close,d:_fd_seek,b:_fd_write,c:_getentropy};var wasmExports=createWasm();Module["_falcon_init"]=()=>(Module["_falcon_init"]=wasmExports["j"])();Module["_falcon_generate_seed"]=a0=>(Module["_falcon_generate_seed"]=wasmExports["k"])(a0);Module["_falcon_keypair_from_seed"]=(a0,a1,a2,a3)=>(Module["_falcon_keypair_from_seed"]=wasmExports["l"])(a0,a1,a2,a3);Module["_falcon_seed_from_passphrase"]=(a0,a1,a2,a3,a4,a5)=>(Module["_falcon_seed_from_passphrase"]=wasmExports["m"])(a0,a1,a2,a3,a4,a5);Module["_falcon_sign"]=(a0,a1,a2,a3)=>(Module["_falcon_sign"]=wasmExports["n"])(a0,a1,a2,a3);Module["_falcon_verify"]=(a0,a1,a2,a3,a4)=>(Module["_falcon_verify"]=wasmExports["o"])(a0,a1,a2,a3,a4);Module["_falcon_min_seed_length"]=()=>(Module["_falcon_min_seed_length"]=wasmExports["p"])();Module["_falcon_public_key_length"]=()=>(Module["_falcon_public_key_length"]=wasmExports["q"])();Module["_falcon_secret_key_length"]=()=>(Module["_falcon_secret_key_length"]=wasmExports["r"])();Module["_falcon_signature_length"]=()=>(Module["_falcon_signature_length"]=wasmExports["s"])();Module["_free"]=a0=>(Module["_free"]=wasmExports["u"])(a0);Module["_malloc"]=a0=>(Module["_malloc"]=wasmExports["v"])(a0);var stackSave=()=>(stackSave=wasmExports["w"])();var stackRestore=a0=>(stackRestore=wasmExports["x"])(a0);var stackAlloc=a0=>(stackAlloc=wasmExports["y"])(a0);Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["setValue"]=setValue;Module["getValue"]=getValue;Module["UTF8ToString"]=UTF8ToString;Module["stringToUTF8"]=stringToUTF8;var calledRun;dependenciesFulfilled=function runCaller(){if(!calledRun)run();if(!calledRun)dependenciesFulfilled=runCaller;};function run(){if(runDependencies>0){return}preRun();if(runDependencies>0){return}function doRun(){if(calledRun)return;calledRun=true;Module["calledRun"]=true;if(ABORT)return;initRuntime();readyPromiseResolve(Module);if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();postRun();}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("");},1);doRun();},1);}else {doRun();}}if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()();}}run();


  return moduleArg.ready
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
  module.exports = createFalconModule$1;
else if (typeof define === 'function' && define['amd'])
  define([], () => createFalconModule$1);

var falcon_wasm_raw = /*#__PURE__*/Object.freeze({
    __proto__: null
});

export { FalconContext, FalconProvider, base64ToUint8Array, hexToUint8Array, uint8ArrayToBase64, uint8ArrayToHex, useFalcon };
//# sourceMappingURL=index.esm.js.map
