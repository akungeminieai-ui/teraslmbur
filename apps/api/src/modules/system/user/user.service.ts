import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ResetPasswordDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, roleId?: string, isActive?: boolean) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        outlet: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    return users.map((u) => {
      // Exclude password from response
      const { password, ...rest } = u;
      return rest;
    });
  }

  async getRoles() {
    let roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    if (roles.length === 0) {
      const defaultRoles = [
        { name: 'OWNER', description: 'Pemilik Outlet: Akses penuh ke seluruh sistem, laporan keuangan, dan manajemen tim', isSystem: true },
        { name: 'MANAGER', description: 'Manajer Outlet: Mengawasi operasional, manajemen produk, stok, dan laporan kasir', isSystem: true },
        { name: 'CASHIER', description: 'Kasir POS: Transaksi penjualan, penerimaan pembayaran, dan cetak struk', isSystem: true },
        { name: 'KITCHEN', description: 'Staf Dapur/Bar: Manajemen tiket pesanan di Kitchen Display System (KDS)', isSystem: true },
        { name: 'WAITER', description: 'Pramusaji: Pemesanan meja (Dine In), bawa pulang, dan status meja', isSystem: true },
      ];

      for (const roleData of defaultRoles) {
        await this.prisma.role.upsert({
          where: { name: roleData.name },
          update: { description: roleData.description },
          create: roleData,
        });
      }

      roles = await this.prisma.role.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return roles;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        outlet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...rest } = user;
    return rest;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email address is already registered');
    }

    let role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      role = await this.prisma.role.findUnique({ where: { name: dto.roleId } });
    }

    if (!role) {
      throw new BadRequestException('Peran (Role) yang dipilih tidak valid');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone || null,
        roleId: role.id,
        outletId: dto.outletId || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        role: true,
        outlet: true,
      },
    });

    const { password, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email address is already in use');
      }
    }

    let roleIdToUpdate = user.roleId;
    if (dto.roleId) {
      let role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) {
        role = await this.prisma.role.findUnique({ where: { name: dto.roleId } });
      }
      if (!role) {
        throw new BadRequestException('Peran (Role) yang dipilih tidak valid');
      }
      roleIdToUpdate = role.id;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        roleId: roleIdToUpdate,
        ...(dto.outletId !== undefined && { outletId: dto.outletId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        role: true,
        outlet: true,
      },
    });

    const { password, ...rest } = updated;
    return rest;
  }

  async toggleStatus(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role.name === 'OWNER' && user.isActive) {
      const activeOwnersCount = await this.prisma.user.count({
        where: {
          role: { name: 'OWNER' },
          isActive: true,
        },
      });

      if (activeOwnersCount <= 1) {
        throw new BadRequestException('Cannot deactivate the only active Owner account');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: { role: true },
    });

    const { password, ...rest } = updated;
    return rest;
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Revoke refresh tokens on password reset
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });

    return { message: 'Password reset successfully' };
  }

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own active account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role.name === 'OWNER') {
      const activeOwnersCount = await this.prisma.user.count({
        where: { role: { name: 'OWNER' } },
      });

      if (activeOwnersCount <= 1) {
        throw new BadRequestException('Cannot delete the only Owner account');
      }
    }

    // Delete refresh tokens first
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }
}
