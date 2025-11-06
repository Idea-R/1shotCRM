'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return { isCollapsed, setIsCollapsed };
}

