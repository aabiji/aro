import { useEffect, useRef, useCallback } from "react";

// schedule/reschedule functions to run after a delay
export default function useDelayedAction() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef<(() => void) | null>(null);

  // schedule a new action
  const trigger = useCallback((fn: () => void) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    callbackRef.current = fn;
    timeoutRef.current = setTimeout(() => {
      fn();
      timeoutRef.current = null;
      callbackRef.current = null;
    }, 10000); // 10 seconds
  }, []);

  // call the function on cleanup if it hasn't ran yet
  useEffect(() => {
    return () => {
      if (timeoutRef.current && callbackRef.current) {
        clearTimeout(timeoutRef.current);
        callbackRef.current();
      }
    }
  }, []);

  return trigger;
}
