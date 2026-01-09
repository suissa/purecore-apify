import { prisma } from "../../../lib/prisma";
import { SignJWT } from "@purecore/one-jwt-4-all"; // Assuming this export exists
import { BadRequestError } from "../../../errors";

export class AuthService {
  async register(data: any) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new BadRequestError("Email already in use");

    const hashedPassword = await Bun.password.hash(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: "USER", // Default
      },
    });

    return this.generateResponse(user);
  }

  async login(data: any) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new BadRequestError("Invalid credentials");

    const valid = await Bun.password.verify(data.password, user.password);
    if (!valid) throw new BadRequestError("Invalid credentials");

    return this.generateResponse(user);
  }

  private async generateResponse(user: any) {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "default_secret_change_me"
    );
    const token = await new SignJWT({ id: user.id, role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
