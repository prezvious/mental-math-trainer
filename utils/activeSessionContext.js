import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

const ActiveSessionContext = createContext({
  registerActiveSessionTerminator: () => () => {},
  terminateActiveSession: async () => ({ handled: false })
});

export function ActiveSessionProvider({ children }) {
  const terminatorRef = useRef(null);

  const registerActiveSessionTerminator = useCallback((terminator) => {
    terminatorRef.current = terminator;

    return () => {
      if (terminatorRef.current === terminator) {
        terminatorRef.current = null;
      }
    };
  }, []);

  const terminateActiveSession = useCallback(async (reason) => {
    if (!terminatorRef.current) {
      return { handled: false };
    }

    return terminatorRef.current(reason);
  }, []);

  const value = useMemo(
    () => ({
      registerActiveSessionTerminator,
      terminateActiveSession
    }),
    [registerActiveSessionTerminator, terminateActiveSession]
  );

  return (
    <ActiveSessionContext.Provider value={value}>
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext);
}
