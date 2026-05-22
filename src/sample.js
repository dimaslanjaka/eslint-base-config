export const greet = (name) => {
  console.log(`Hello, ${name}!`);
};

export function add(a, b) {
  return a + b;
}

const message = 'Hello from JS ESM';
greet(message);
