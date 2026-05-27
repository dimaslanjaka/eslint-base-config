export function name(): undefined;
export function name(who: string): string;
export function name(who?: string) {
  return who;
}

class User {
  name: string;
  age: number;

  // Overload signatures
  constructor(name: string);
  constructor(name: string, age: number);

  // Implementation
  constructor(name: string, age?: number) {
    this.name = name;
    this.age = age ?? 0;
  }

  info() {
    return `${this.name} (${this.age})`;
  }
}

// Usage
const a = new User('Dimas');
const b = new User('Dimas', 25);

console.log(a.info()); // Dimas (0)
console.log(b.info()); // Dimas (25)
