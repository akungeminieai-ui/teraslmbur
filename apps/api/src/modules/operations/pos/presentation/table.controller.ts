import { Controller, Get, Patch, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { TableStatus } from '@/generated/client';

@ApiTags('Tables')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tables')
export class TableController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tables and their statuses' })
  async findAll() {
    return this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new table' })
  async create(@Body() body: { number: number; name?: string; capacity?: number; section?: string }) {
    return this.prisma.table.create({
      data: {
        number: Number(body.number),
        name: body.name || null,
        capacity: body.capacity ? Number(body.capacity) : 4,
        section: body.section || null,
        status: TableStatus.AVAILABLE,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update table details' })
  async updateDetails(
    @Param('id') id: string,
    @Body() body: { number?: number; name?: string; capacity?: number; section?: string; status?: TableStatus }
  ) {
    return this.prisma.table.update({
      where: { id },
      data: {
        number: body.number !== undefined ? Number(body.number) : undefined,
        name: body.name !== undefined ? (body.name || null) : undefined,
        capacity: body.capacity !== undefined ? Number(body.capacity) : undefined,
        section: body.section !== undefined ? (body.section || null) : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a table' })
  async delete(@Param('id') id: string) {
    return this.prisma.table.delete({
      where: { id },
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a specific table status' })
  async updateOne(@Param('id') id: string, @Body() body: { status: TableStatus }) {
    return this.prisma.table.update({
      where: { id },
      data: { status: body.status },
    });
  }

  @Patch()
  @ApiOperation({ summary: 'Update table status (supports bulk or single via body)' })
  async update(@Body() body: { id: string; status: TableStatus }) {
    return this.prisma.table.update({
      where: { id: body.id },
      data: { status: body.status },
    });
  }
}
