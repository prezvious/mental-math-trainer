import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ActiveSessionContext = createContext({
  registerActiveSessionTerminator: () => () => {},
  terminateActiveSession: async () => ({ handled: false }),
  registerActiveSessionExitHandler: () => () => {},
  requestActiveSessionExit: async () => true,
  hasActiveSession: false
});

export function ActiveSessionProvider({ children }) {
  const terminatorRef = useRef(null);
  const exitHandlerRef = useRef(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

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

  const registerActiveSessionExitHandler = useCallback((handler) => {
    exitHandlerRef.current = handler;
    setHasActiveSession(true);
    return () => {
      if (exitHandlerRef.current === handler) {
        exitHandlerRef.current = null;
        setHasActiveSession(false);
      }
    };
  }, []);

  const requestActiveSessionExit = useCallback(async (reason = 'end-round') => {
    if (!exitHandlerRef.current) return true;
    return exitHandlerRef.current(reason);
  }, []);

  const value = useMemo(
    () => ({
      registerActiveSessionTerminator,
      terminateActiveSession,
      registerActiveSessionExitHandler,
      requestActiveSessionExit,
      hasActiveSession
    }),
    [registerActiveSessionTerminator, terminateActiveSession,
      registerActiveSessionExitHandler, requestActiveSessionExit, hasActiveSession]
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
