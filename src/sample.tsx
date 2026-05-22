import React from 'react';

interface GreetingProps {
  name: string;
}

export function Greeting({ name }: GreetingProps) {
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
