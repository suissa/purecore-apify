export type User = { id: number; name: string };

const FAKE_DB: User[] = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Linus" }
];

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    // simula I/O
    await new Promise((r) => setTimeout(r, 40));
    return FAKE_DB.find((u) => u.id === id) ?? null;
  }
}
