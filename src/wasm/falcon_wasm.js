// Mock WASM module for testing React structure
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
