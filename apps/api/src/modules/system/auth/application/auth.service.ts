import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { AuthResponse, AuthTokens, User, Permission } from '@teras-lmbur/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code) as Permission[];
    const tokens = await this.generateTokens(user.id, user.email, user.role.name, permissions, user.outletId);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const formattedUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        isSystem: user.role.isSystem,
        permissions,
        createdAt: user.role.createdAt.toISOString(),
        updatedAt: user.role.updatedAt.toISOString(),
      },
      outletId: user.outletId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return { user: formattedUser, tokens };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('Access Denied');
    }

    const record = await this.prisma.refreshToken.findFirst({
      where: { userId, token: refreshToken },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code) as Permission[];
    const tokens = await this.generateTokens(user.id, user.email, user.role.name, permissions, user.outletId);

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { id: record.id } });
    await this.updateRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code) as Permission[];

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        isSystem: user.role.isSystem,
        permissions,
        createdAt: user.role.createdAt.toISOString(),
        updatedAt: user.role.updatedAt.toISOString(),
      },
      outletId: user.outletId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    permissions: Permission[],
    outletId: string | null
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role, permissions, outletId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins
    };
  }

  private async updateRefreshToken(userId: string, token: string): Promise<void> {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days expiry

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: expiry,
      },
    });
  }
}
