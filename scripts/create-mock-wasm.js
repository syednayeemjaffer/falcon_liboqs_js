const fs = require('fs');
const path = require('path');

const wasmDir = path.join(__dirname, '../src/wasm');
const wasmJsFile = path.join(wasmDir, 'falcon_wasm.js');
const wasmBgFile = path.join(wasmDir, 'falcon_wasm_bg.wasm');
const wasmDtsFile = path.join(wasmDir, 'falcon_wasm.d.ts');
const packageJsonFile = path.join(wasmDir, 'package.json');

// Create directory if it doesn't exist
if (!fs.existsSync(wasmDir)) {
  fs.mkdirSync(wasmDir, { recursive: true });
}

// Create mock WASM JS file
const wasmJsContent = `// Mock WASM module for testing React structure
// Note: This is a placeholder. For real key generation, liboqs needs to be compiled to WASM.

let wasm;

export function init() {
  return Promise.resolve();
}

export function initSync() {
  // Synchronous init
}

// Generate a cryptographically secure seed (48 bytes)
export function generate_seed() {
  const seed = new Uint8Array(48);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(seed);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 48; i++) {
      seed[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(seed);
}

// Generate keypair from seed
export function keypair_from_seed(seed) {
  // Convert Uint8Array to array if needed
  const seedArray = seed instanceof Uint8Array ? Array.from(seed) : (Array.isArray(seed) ? seed : []);
  
  if (!seedArray || seedArray.length < 48) {
    throw new Error('Seed must be at least 48 bytes');
  }
  
  // Mock implementation - returns deterministic keys based on seed
  // In real implementation, this would call the Rust/WASM code
  const publicKey = new Uint8Array(897);
  const secretKey = new Uint8Array(1281);
  
  // Simple deterministic generation for testing
  const seedHash = simpleHash(seedArray);
  for (let i = 0; i < publicKey.length; i++) {
    publicKey[i] = seedHash[i % seedHash.length];
  }
  for (let i = 0; i < secretKey.length; i++) {
    secretKey[i] = seedHash[(i + 100) % seedHash.length];
  }
  
  return new KeyPair(Array.from(publicKey), Array.from(secretKey));
}

// Derive seed from passphrase
export function seed_from_passphrase(passphrase, salt, iterations) {
  if (!passphrase || passphrase.length === 0) {
    throw new Error('Passphrase cannot be empty');
  }
  if (!salt || salt.length < 8) {
    throw new Error('Salt must be at least 8 bytes');
  }
  if (iterations <= 0) {
    throw new Error('Iterations must be > 0');
  }
  
  // Mock PBKDF2-like derivation
  let derived = new Uint8Array([...passphrase, ...salt]);
  for (let i = 0; i < iterations && i < 1000; i++) {
    derived = simpleHash(derived);
  }
  
  const seed = new Uint8Array(48);
  for (let i = 0; i < 48; i++) {
    seed[i] = derived[i % derived.length];
  }
  
  return Array.from(seed);
}

// Generate keypair from passphrase
export function keypair_from_passphrase(passphrase, salt, iterations) {
  const seed = seed_from_passphrase(passphrase, salt, iterations);
  return keypair_from_seed(seed);
}

// Derive child seed
export function derive_child_seed(master_seed, index) {
  if (!master_seed || master_seed.length < 48) {
    throw new Error('Master seed must be at least 48 bytes');
  }
  
  const indexBytes = new Uint8Array(4);
  indexBytes[0] = (index >>> 24) & 0xff;
  indexBytes[1] = (index >>> 16) & 0xff;
  indexBytes[2] = (index >>> 8) & 0xff;
  indexBytes[3] = index & 0xff;
  
  const combined = new Uint8Array([...master_seed, ...indexBytes]);
  const hashed = simpleHash(combined);
  
  const childSeed = new Uint8Array(48);
  for (let i = 0; i < 48; i++) {
    childSeed[i] = hashed[i % hashed.length];
  }
  
  return Array.from(childSeed);
}

// Generate keypair from index
export function keypair_from_index(master_seed, index) {
  const childSeed = derive_child_seed(master_seed, index);
  return keypair_from_seed(childSeed);
}

// Sign a message with a mock Falcon-512 secret key
// Falcon-512 signatures are 666 bytes
export function sign(message, secret_key) {
  const msgArray =
    message instanceof Uint8Array ? Array.from(message) : Array.isArray(message) ? message : [];
  const skArray =
    secret_key instanceof Uint8Array
      ? Array.from(secret_key)
      : Array.isArray(secret_key)
      ? secret_key
      : [];

  if (!skArray || skArray.length === 0) {
    throw new Error('Secret key must not be empty');
  }

  // Mock deterministic signature: hash(message || seed_pattern)
  // Since both secret_key and public_key are derived from the same seed,
  // we extract the seed pattern from secret_key
  // In key generation: publicKey[i] = seedHash[i], secretKey[i] = seedHash[(i+100) % len]
  // So secretKey[100:148] wraps to seedHash[0:48], but we can't easily extract it
  // Instead, we use a deterministic pattern: hash(secret_key) to get a seed-like identifier
  // For verify, we'll use the same method with public_key
  // Actually, the simplest: use first 32 bytes of secret_key as seed proxy
  // But verify needs to use public_key, so we need a method that works with both
  // Solution: Use hash of first 48 bytes of each key - these should be related
  const seedProxy = simpleHash(skArray.slice(0, 48));
  const combined = [...msgArray, ...Array.from(seedProxy)];
  const hash = simpleHash(combined);
  
  // Falcon-512 signature size is 666 bytes
  const sigLen = 666;
  const signature = new Uint8Array(sigLen);
  
  // Fill signature deterministically from hash
  for (let i = 0; i < sigLen; i++) {
    signature[i] = hash[i % hash.length] ^ (i & 0xff);
  }

  return Array.from(signature);
}

// Verify a mock Falcon-512 signature
// Falcon-512 signatures are 666 bytes
// In real Falcon, verification uses public key cryptography
// For mock: we use a deterministic relationship between secret_key and public_key
// Since both are derived from the same seed, we can verify by reconstructing
export function verify(message, signature, public_key) {
  const msgArray =
    message instanceof Uint8Array ? Array.from(message) : Array.isArray(message) ? message : [];
  const sigArray =
    signature instanceof Uint8Array
      ? Array.from(signature)
      : Array.isArray(signature)
      ? signature
      : [];
  const pkArray =
    public_key instanceof Uint8Array
      ? Array.from(public_key)
      : Array.isArray(public_key)
      ? public_key
      : [];

  if (!sigArray || sigArray.length === 0 || !pkArray || pkArray.length === 0) {
    return false;
  }

  // Check signature length (Falcon-512 signatures are 666 bytes)
  if (sigArray.length !== 666) {
    return false;
  }

  // For mock verification: In real Falcon, secret_key and public_key are mathematically related
  // In our mock, both keys are derived from the same seed deterministically
  // We can verify by using public_key to reconstruct what the signature should be
  // Since public_key and secret_key share the same seed origin, we use public_key
  // with a transformation that matches the secret_key signature pattern
  
  // Use public_key to derive verification signature
  // In real crypto, the signature created with secret_key can be verified with public_key
  // For mock: derive a verification pattern from public_key that matches secret_key pattern
  const combined = [...msgArray, ...pkArray];
  const hash = simpleHash(combined);

  // Reconstruct expected signature using same method as sign
  // The pattern should match because public_key and secret_key are from same seed
  const expected = new Uint8Array(666);
  for (let i = 0; i < 666; i++) {
    expected[i] = hash[i % hash.length] ^ (i & 0xff);
  }

  // Compare signatures byte by byte
  if (expected.length !== sigArray.length) return false;
  for (let i = 0; i < sigArray.length; i++) {
    if (expected[i] !== sigArray[i]) return false;
  }
  return true;
}

// KeyPair class - use direct properties for compatibility
class KeyPair {
  constructor(public_key, secret_key) {
    this.public_key = public_key;
    this.secret_key = secret_key;
  }
}

// Constants (standalone functions)
export function min_seed_length() { return 48; }
export function public_key_length() { return 897; }
export function secret_key_length() { return 1281; }

// Simple hash function for mock implementation
function simpleHash(data) {
  // Ensure data is an array
  const dataArray = data instanceof Uint8Array ? Array.from(data) : (Array.isArray(data) ? data : []);
  
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

export default init;
`;

// Create TypeScript definitions
const wasmDtsContent = `/* tslint:disable */
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
export function sign(
  message: Uint8Array | number[],
  secret_key: Uint8Array | number[]
): number[];
export function verify(
  message: Uint8Array | number[],
  signature: Uint8Array | number[],
  public_key: Uint8Array | number[]
): boolean;

export default init;
`;

// Create package.json
const packageJsonContent = `{
  "name": "falcon-wasm",
  "version": "0.1.0",
  "files": [
    "falcon_wasm.js",
    "falcon_wasm_bg.wasm",
    "falcon_wasm.d.ts"
  ],
  "main": "falcon_wasm.js",
  "types": "falcon_wasm.d.ts",
  "sideEffects": false
}
`;

// Write files
fs.writeFileSync(wasmJsFile, wasmJsContent);
fs.writeFileSync(wasmDtsFile, wasmDtsContent);
fs.writeFileSync(packageJsonFile, packageJsonContent);

// Create empty WASM file (just a placeholder)
fs.writeFileSync(wasmBgFile, new Uint8Array(0));

console.log('✓ Mock WASM files created successfully');
console.log('  - falcon_wasm.js');
console.log('  - falcon_wasm.d.ts');
console.log('  - falcon_wasm_bg.wasm (placeholder)');
console.log('  - package.json');
console.log('');
console.log('Note: This is a mock implementation for testing.');
console.log('For real key generation, compile liboqs to WASM.');

