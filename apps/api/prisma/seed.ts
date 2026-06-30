import { PrismaClient, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Default Outlet
  const outlet = await prisma.outlet.upsert({
    where: { id: 'default-outlet' },
    update: {},
    create: {
      id: 'default-outlet',
      code: 'TL-MAIN',
      name: 'Teras Lmbur — Main Branch',
      address: 'Cairo, Egypt',
      phone: '+201000000000',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      status: 'ACTIVE',
    },
  });
  console.log(`🏢 Seeded Outlet: ${outlet.name}`);

  // 2. Define Permissions List
  const permissionCodes = [
    { code: 'products.create', module: 'products', action: 'create', description: 'Create products' },
    { code: 'products.read', module: 'products', action: 'read', description: 'View products' },
    { code: 'products.update', module: 'products', action: 'update', description: 'Update products' },
    { code: 'products.delete', module: 'products', action: 'delete', description: 'Delete products' },
    
    { code: 'categories.create', module: 'categories', action: 'create', description: 'Create categories' },
    { code: 'categories.read', module: 'categories', action: 'read', description: 'View categories' },
    { code: 'categories.update', module: 'categories', action: 'update', description: 'Update categories' },
    { code: 'categories.delete', module: 'categories', action: 'delete', description: 'Delete categories' },
    
    { code: 'orders.create', module: 'orders', action: 'create', description: 'Create orders' },
    { code: 'orders.read', module: 'orders', action: 'read', description: 'View orders' },
    { code: 'orders.update', module: 'orders', action: 'update', description: 'Update orders' },
    { code: 'orders.void', module: 'orders', action: 'void', description: 'Void orders' },
    
    { code: 'tables.create', module: 'tables', action: 'create', description: 'Create tables' },
    { code: 'tables.read', module: 'tables', action: 'read', description: 'View tables' },
    { code: 'tables.update', module: 'tables', action: 'update', description: 'Update tables' },
    { code: 'tables.delete', module: 'tables', action: 'delete', description: 'Delete tables' },
    
    { code: 'inventory.read', module: 'inventory', action: 'read', description: 'View stock/ingredients' },
    { code: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Adjust stock levels' },
    { code: 'inventory.manage', module: 'inventory', action: 'manage', description: 'Manage suppliers/purchases' },
    
    { code: 'reports.read', module: 'reports', action: 'read', description: 'View financial reports' },
    { code: 'reports.export', module: 'reports', action: 'export', description: 'Export report documents' },
    
    { code: 'users.read', module: 'users', action: 'read', description: 'View users' },
    { code: 'users.manage', module: 'users', action: 'manage', description: 'Add/edit/remove team members' },
    
    { code: 'settings.read', module: 'settings', action: 'read', description: 'View settings' },
    { code: 'settings.update', module: 'settings', action: 'update', description: 'Update system settings' },
    
    { code: 'finance.read', module: 'finance', action: 'read', description: 'View financial details' },
    { code: 'finance.manage', module: 'finance', action: 'manage', description: 'Manage expenses and closings' },
    
    { code: 'kitchen.read', module: 'kitchen', action: 'read', description: 'View kitchen display' },
    { code: 'kitchen.manage', module: 'kitchen', action: 'manage', description: 'Update ticket preparation statuses' },
    
    { code: 'analytics.read', module: 'analytics', action: 'read', description: 'View analytics dashboard' },
  ];

  const seededPermissions = [];
  for (const perm of permissionCodes) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    seededPermissions.push(p);
  }
  console.log(`🔐 Seeded ${seededPermissions.length} permissions.`);

  // Helper mapping helper to assign permissions
  const assignPermissions = async (roleName: string, allowedPrefixes: string[]) => {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return;

    const matchedPermissions = seededPermissions.filter((p) =>
      allowedPrefixes.some((prefix) => {
        if (prefix.endsWith('.*')) {
          const mod = prefix.split('.')[0];
          return p.module === mod;
        }
        return p.code === prefix;
      })
    );

    for (const p of matchedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: p.id,
        },
      });
    }
  };

  // 3. Seed Roles
  const roles = [
    { name: 'OWNER', description: 'System Owner with full access rights', isSystem: true },
    { name: 'MANAGER', description: 'Outlet Manager supervising operations', isSystem: true },
    { name: 'CASHIER', description: 'Sales and transaction cashier staff', isSystem: true },
    { name: 'KITCHEN', description: 'Kitchen food prep management staff', isSystem: true },
    { name: 'WAITER', description: 'Customer serving waitstaff service', isSystem: true },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
  }
  console.log('👥 Seeded default roles.');

  // 4. Populate Permissions per Role
  await assignPermissions('OWNER', ['*.*']); // gets matches below
  // For owner, match all
  const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
  if (ownerRole) {
    for (const p of seededPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: p.id },
      });
    }
  }

  await assignPermissions('MANAGER', [
    'products.create', 'products.read', 'products.update',
    'categories.create', 'categories.read', 'categories.update',
    'orders.create', 'orders.read', 'orders.update', 'orders.void',
    'tables.create', 'tables.read', 'tables.update',
    'inventory.read', 'inventory.adjust',
    'reports.read', 'reports.export',
    'users.read',
    'settings.read',
    'finance.read',
    'kitchen.read', 'kitchen.manage',
    'analytics.read',
  ]);

  await assignPermissions('CASHIER', [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'finance.read',
    'kitchen.read',
  ]);

  await assignPermissions('KITCHEN', [
    'orders.read',
    'kitchen.read', 'kitchen.manage',
    'inventory.read',
  ]);

  await assignPermissions('WAITER', [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'kitchen.read',
  ]);
  console.log('🔒 Assigned permission mapping to roles.');

  // 5. Seed default Owner Account
  const ownerDbRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
  if (ownerDbRole) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const ownerUser = await prisma.user.upsert({
      where: { email: 'owner@teraslmbur.com' },
      update: {},
      create: {
        email: 'owner@teraslmbur.com',
        name: 'Teras Lmbur Owner',
        password: passwordHash,
        roleId: ownerDbRole.id,
        outletId: 'default-outlet',
        isActive: true,
      },
    });
    console.log(`👤 Seeded Default Owner Account: ${ownerUser.email} (pass: password123)`);
  }

  // 6. Seed master Units
  const units = [
    { name: 'Gram', abbreviation: 'g', type: UnitType.WEIGHT },
    { name: 'Kilogram', abbreviation: 'kg', type: UnitType.WEIGHT },
    { name: 'Liter', abbreviation: 'L', type: UnitType.VOLUME },
    { name: 'Milliliter', abbreviation: 'ml', type: UnitType.VOLUME },
    { name: 'Piece', abbreviation: 'pcs', type: UnitType.COUNT },
    { name: 'Bottle', abbreviation: 'bot', type: UnitType.COUNT },
    { name: 'Pack', abbreviation: 'pack', type: UnitType.PACK },
    { name: 'Box', abbreviation: 'box', type: UnitType.PACK },
    { name: 'Cup', abbreviation: 'cup', type: UnitType.COUNT },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { abbreviation: unit.abbreviation, type: unit.type },
      create: unit,
    });
  }
  console.log('🧪 Seeded inventory unit metrics.');
  
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
