import type { NavSection } from '@teras-lmbur/types';

export const siteConfig = {
  name: 'Teras Lmbur OS',
  description: 'Restaurant Management System — From single outlet to franchise platform',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
} as const;

export const navigationConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { title: 'Orders', href: '/orders', icon: 'ShoppingCart', permission: 'orders.read' },
      { title: 'Kitchen', href: '/kitchen', icon: 'ChefHat', permission: 'kitchen.read' },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Products', href: '/products', icon: 'Package', permission: 'products.read' },
      { title: 'Categories', href: '/categories', icon: 'Tags', permission: 'categories.read' },
      { title: 'Tables', href: '/tables', icon: 'Armchair', permission: 'tables.read' },
      { title: 'Inventory', href: '/inventory', icon: 'Warehouse', permission: 'inventory.read' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { title: 'Reports', href: '/reports', icon: 'FileBarChart', permission: 'reports.read' },
      { title: 'Analytics', href: '/analytics', icon: 'TrendingUp', permission: 'analytics.read' },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Users', href: '/users', icon: 'Users', permission: 'users.read' },
      { title: 'Settings', href: '/settings', icon: 'Settings', permission: 'settings.read' },
    ],
  },
];
