export interface User {
  id: number;
  name: string;
  email?: string;
}

export const defaultUser: User = {
  id: 1,
  name: 'Sample User'
};

export function formatUser(user: User): string {
  const emailPart = user.email ? ` <${user.email}>` : '';
  return `${user.id}: ${user.name}${emailPart}`;
}

export class UserService {
  private readonly users: User[] = [defaultUser];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUsers(): readonly User[] {
    return this.users;
  }
}

const service = new UserService();
service.addUser({ id: 2, name: 'Another User', email: 'user@example.com' });

for (const user of service.getUsers()) {
  console.log(formatUser(user));
}
