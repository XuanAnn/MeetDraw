import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserModel, UserRecord } from '../models/user.model';
import { ENV } from '../config/env';
import { RegisterDto, LoginDto, AuthResponse, User } from '@meetdraw/shared';

export class AuthService {
  // In-memory active session tracking: userId -> sessionId
  private static activeSessions: Map<string, string> = new Map();

  static getActiveSession(userId: string): string | undefined {
    return this.activeSessions.get(userId);
  }

  static setActiveSession(userId: string, sessionId: string): void {
    this.activeSessions.set(userId, sessionId);
  }

  static invalidateSession(userId: string): void {
    this.activeSessions.delete(userId);
  }

  static async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim();

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email is already in use');
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser: UserRecord = {
      id: uuidv4(),
      username,
      email,
      password_hash: passwordHash,
      createdAt: new Date().toISOString(),
    };

    await UserModel.create(newUser);

    const user: User = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    const sessionId = uuidv4();
    this.setActiveSession(user.id, sessionId);
    const token = this.generateToken(user, sessionId);
    return { token, user };
  }

  static async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const userRecord = await UserModel.findByEmail(email);
    if (!userRecord) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, userRecord.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const user: User = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      createdAt: userRecord.createdAt,
    };

    const sessionId = uuidv4();
    this.setActiveSession(user.id, sessionId);
    const token = this.generateToken(user, sessionId);
    return { token, user };
  }

  static generateToken(user: User, sessionId?: string): string {
    return jwt.sign(
      { id: user.id, username: user.username, email: user.email, sessionId },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, ENV.JWT_SECRET);
  }
}
