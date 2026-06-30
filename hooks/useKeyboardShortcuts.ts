import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

type ReactFlowInstance = ReturnType<typeof useReactFlow>;

/**
 * Custom hook to listen for keyboard shortcuts on window.
 * Ignores shortcuts while typing in inputs, textareas, or editable text fields.
 *
 * @param reactFlowInstance - The React Flow instance returned by useReactFlow
 * @param undo - Liveblocks history undo action
 * @param redo - Liveblocks history redo action
 */
export function useKeyboardShortcuts(
  reactFlowInstance: ReactFlowInstance,
  undo: () => void,
  redo: () => void
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts while typing in inputs, textareas, or editable text fields
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable ||
          activeElement.closest('[contenteditable="true"]') !== null)
      ) {
        return;
      }

      const isMac = typeof window !== "undefined" && navigator.userAgent.indexOf("Mac") !== -1;
      const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      if (isCmdOrCtrl) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
        }
      } else {
        // standalone keys
        if (event.key === "+" || event.key === "=") {
          event.preventDefault();
          reactFlowInstance.zoomIn({ duration: 200 });
        } else if (event.key === "-") {
          event.preventDefault();
          reactFlowInstance.zoomOut({ duration: 200 });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactFlowInstance, undo, redo]);
}
