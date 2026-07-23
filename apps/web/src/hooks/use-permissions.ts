'use client';

import { useEffect, useState } from 'react';
import type { Permission } from '@teras-lmbur/types';

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('userPermissions');
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPermissions(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const hasPermission = (required: Permission) => {
    return permissions.includes(required);
  };

  const hasAnyPermission = (required: Permission[]) => {
    return required.some((p) => permissions.includes(p));
  };

  return { permissions, hasPermission, hasAnyPermission };
}
