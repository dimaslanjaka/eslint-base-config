import React from 'react';

export function Greeting({ name }) {
  return <div>Hello, {name}!</div>;
}

export function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <Greeting name="World" />
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
