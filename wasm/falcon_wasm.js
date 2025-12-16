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
    const mod = await import('./falcon_wasm_raw.js');
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

export { init, initSync, generate_seed, keypair_from_seed, sign, verify, min_seed_length, public_key_length, secret_key_length, signature_length, KeyPair };
export default init;
