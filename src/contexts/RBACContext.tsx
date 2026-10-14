import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'gigcar_manager' | 'marine_cor';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  allowedFleets: string[];
}

export const MOCK_USERS: Record<UserRole, User> = {
  super_admin: {
    id: '1',
    name: 'Jenny',
    role: 'super_admin',
    email: 'jenny@marinemotion.com.au',
    allowedFleets: ['GigCar', 'Fleetcar', 'Yonder'],
  },
  gigcar_manager: {
    id: '2',
    name: 'Dave',
    role: 'gigcar_manager',
    email: 'dave@gigcar.com.au',
    allowedFleets: ['GigCar'],
  },
  marine_cor: {
    id: '3',
    name: 'Capt. Jenkins',
    role: 'marine_cor',
    email: 'captain.jenkins@marinemotion.com.au',
    allowedFleets: ['Fleetcar'],
  },
};

interface RBACContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  canAccessFleet: (fleet: string) => boolean;
  hasFullAccess: () => boolean;
  isCOR: () => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS.super_admin);

  const switchRole = (role: UserRole) => {
    setCurrentUser(MOCK_USERS[role]);
  };

  const canAccessFleet = (fleet: string) => {
    return currentUser.allowedFleets.includes(fleet);
  };

  const hasFullAccess = () => {
    return currentUser.role === 'super_admin';
  };

  const isCOR = () => {
    return currentUser.role === 'marine_cor';
  };

  return (
    <RBACContext.Provider
      value={{
        currentUser,
        switchRole,
        canAccessFleet,
        hasFullAccess,
        isCOR,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  return context;
}
