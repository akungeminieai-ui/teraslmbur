import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { UserService } from './user.service';
import { createUserSchema, type CreateUserDto } from './dto/create-user.dto';
import {
  updateUserSchema,
  type UpdateUserDto,
  resetPasswordSchema,
  type ResetPasswordDto,
} from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get all team members with optional search and filters' })
  async findAll(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('isActive') isActive?: string
  ) {
    const parsedIsActive =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.userService.findAll(search, roleId, parsedIsActive);
  }

  @Get('roles')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get all available roles for team member assignment' })
  async getRoles() {
    return this.userService.getRoles();
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user details by ID' })
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.write')
  @ApiOperation({ summary: 'Create a new team member account' })
  async create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  @ApiOperation({ summary: 'Update team member information and role' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto
  ) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @RequirePermissions('users.write')
  @ApiOperation({ summary: 'Toggle user active status' })
  async toggleStatus(@Param('id') id: string) {
    return this.userService.toggleStatus(id);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Reset team member password' })
  async resetPassword(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto
  ) {
    return this.userService.resetPassword(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a team member account' })
  async delete(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.userService.delete(id, currentUserId);
  }
}
