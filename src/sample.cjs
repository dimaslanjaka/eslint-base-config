const greet = (name) => {
  console.log(`Hello, ${name}!`);
};

function add(a, b) {
  return a + b;
}

const message = 'Hello from CJS';
greet(message);

module.exports = { greet, add };
