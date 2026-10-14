import { createContext, useContext, ReactNode, useState, useCallback, useRef } from 'react';

interface NavigationContextType {
  navigateTo: (view: string) => void;
  registerResetCallback: (viewName: string, callback: () => void) => void;
  unregisterResetCallback: (viewName: string) => void;
  registerNavigationBlocker: (shouldBlock: () => boolean, onBlock: (proceed: () => void) => boolean) => void;
  unregisterNavigationBlocker: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  onNavigate: (view: string) => void;
}

export function NavigationProvider({ children, onNavigate }: NavigationProviderProps) {
  const [resetCallbacks, setResetCallbacks] = useState<Map<string, () => void>>(new Map());
  const navigationBlockerRef = useRef<{
    shouldBlock: () => boolean;
    onBlock: (proceed: () => void) => boolean;
  } | null>(null);

  const navigateTo = useCallback((view: string) => {
    const executeNavigation = () => {
      const callback = resetCallbacks.get(view);
      if (callback) {
        callback();
      }
      onNavigate(view);
    };

    if (navigationBlockerRef.current) {
      const shouldBlock = navigationBlockerRef.current.shouldBlock();
      if (shouldBlock) {
        const canProceed = navigationBlockerRef.current.onBlock(executeNavigation);
        if (!canProceed) {
          return;
        }
      }
    }

    executeNavigation();
  }, [resetCallbacks, onNavigate]);

  const registerResetCallback = useCallback((viewName: string, callback: () => void) => {
    setResetCallbacks(prev => {
      const newMap = new Map(prev);
      newMap.set(viewName, callback);
      return newMap;
    });
  }, []);

  const unregisterResetCallback = useCallback((viewName: string) => {
    setResetCallbacks(prev => {
      const newMap = new Map(prev);
      newMap.delete(viewName);
      return newMap;
    });
  }, []);

  const registerNavigationBlocker = useCallback((
    shouldBlock: () => boolean,
    onBlock: (proceed: () => void) => boolean
  ) => {
    navigationBlockerRef.current = { shouldBlock, onBlock };
  }, []);

  const unregisterNavigationBlocker = useCallback(() => {
    navigationBlockerRef.current = null;
  }, []);

  return (
    <NavigationContext.Provider value={{
      navigateTo,
      registerResetCallback,
      unregisterResetCallback,
      registerNavigationBlocker,
      unregisterNavigationBlocker
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigate() {
  const context = useContext(NavigationContext);
  if (!context) {
    return {
      navigateTo: () => {},
      registerResetCallback: () => {},
      unregisterResetCallback: () => {},
      registerNavigationBlocker: () => {},
      unregisterNavigationBlocker: () => {}
    };
  }
  return context;
}
