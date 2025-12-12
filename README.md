# react-falcon

React library for Falcon-512 seeded key generation using WebAssembly.

## Installation

```bash
npm install react-falcon
```

## Usage

### Basic Setup

```jsx
import { FalconProvider, useFalcon } from 'react-falcon';

function App() {
  return (
    <FalconProvider>
      <YourComponent />
    </FalconProvider>
  );
}
```

### Using the Hook

```jsx
import { useFalcon } from 'react-falcon';

function MyComponent() {
  const { isReady, generateSeed, keypairFromSeed } = useFalcon();

  const handleGenerate = () => {
    const seed = generateSeed();
    const { publicKey, secretKey } = keypairFromSeed(seed);
    console.log('Public Key:', publicKey);
    console.log('Secret Key:', secretKey);
  };

  return (
    <button onClick={handleGenerate} disabled={!isReady}>
      Generate Keypair
    </button>
  );
}
```

## API

See the main README.md for complete API documentation.

