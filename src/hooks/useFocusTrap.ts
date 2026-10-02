import { useEffect, useRef, type RefObject } from 'react';

export interface UseFocusTrapOptions {
  /**
   * Ref to element that should be focused when the trap activates.
   * If not provided or element is null, the first focusable element is focused.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Whether focus should be returned to the element that was focused before the trap activated.
   * Defaults to true.
   */
  returnFocus?: boolean;
  /**
   * Whether the trap is temporarily disabled even if active.
   * Defaults to false.
   */
  disabled?: boolean;
}

// Selector covering all standard focusable interactive HTML elements
export const FOCUSABLE_ELEMENTS_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'area[href]:not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]:not([tabindex="-1"])',
].join(', ');

// Global active trap stack to support nested modals cleanly (e.g. AlertModal on top of AddIdeaModal)
const activeTrapStack: HTMLElement[] = [];

/**
 * Prune any DOM nodes that have been detached from document
 */
function pruneDisconnectedTraps(): void {
  for (let i = activeTrapStack.length - 1; i >= 0; i--) {
    if (!activeTrapStack[i].isConnected) {
      activeTrapStack.splice(i, 1);
    }
  }
}

export function getActiveTrapStack(): readonly HTMLElement[] {
  pruneDisconnectedTraps();
  return activeTrapStack;
}

export function isTopmostTrap(container: HTMLElement | null): boolean {
  if (!container) return false;
  pruneDisconnectedTraps();
  if (activeTrapStack.length === 0) return false;
  return activeTrapStack[activeTrapStack.length - 1] === container;
}

export function hasActiveTrap(): boolean {
  pruneDisconnectedTraps();
  return activeTrapStack.length > 0;
}

/**
 * useFocusTrap: Traps Tab / Shift+Tab cycling within the container element,
 * automatically focuses the first focusable element, and restores focus to
 * the trigger element upon closing. Handles stacked modals cleanly.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  options: UseFocusTrapOptions = {}
): RefObject<T> {
  const containerRef = useRef<T>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const { initialFocusRef, returnFocus = true, disabled = false } = options;

  useEffect(() => {
    if (!isOpen || disabled) return;

    // Record the element that had focus right before the modal was opened
    triggerElementRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    pruneDisconnectedTraps();

    // Register into trap stack
    if (!activeTrapStack.includes(container)) {
      activeTrapStack.push(container);
    }

    const getFocusableNodes = (): HTMLElement[] => {
      if (!containerRef.current) return [];
      const nodes = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR)
      );
      return nodes.filter((node) => {
        // Exclude elements with tabindex -1
        if (node.getAttribute('tabindex') === '-1' || node.tabIndex === -1) {
          return false;
        }
        // Exclude disabled elements
        if (
          node.hasAttribute('disabled') ||
          (node as HTMLInputElement | HTMLButtonElement).disabled
        ) {
          return false;
        }
        // Exclude invisible or hidden nodes
        const isHidden =
          node.getAttribute('aria-hidden') === 'true' ||
          node.hidden ||
          node.style.display === 'none' ||
          node.style.visibility === 'hidden';
        if (isHidden) return false;

        // If the container has layout geometry computed, filter zero-sized invisible nodes
        const containerHasLayout =
          containerRef.current!.offsetWidth > 0 ||
          containerRef.current!.offsetHeight > 0 ||
          containerRef.current!.getClientRects().length > 0;

        if (containerHasLayout) {
          const isZeroSize =
            node.offsetWidth === 0 &&
            node.offsetHeight === 0 &&
            node.getClientRects().length === 0;
          if (isZeroSize) return false;
        }

        return true;
      });
    };

    // Auto-focus initial element, first editable input, or first focusable node inside container
    const focusTimer = setTimeout(() => {
      if (!containerRef.current || !isTopmostTrap(containerRef.current)) return;

      if (initialFocusRef?.current && typeof initialFocusRef.current.focus === 'function') {
        initialFocusRef.current.focus();
        return;
      }

      // Check for autofocus element inside container
      const autofocusEl = containerRef.current.querySelector<HTMLElement>('[autofocus]:not([disabled])');
      if (autofocusEl && typeof autofocusEl.focus === 'function') {
        autofocusEl.focus();
        return;
      }

      // If container has editable inputs/textareas/selects, prioritize the first editable input
      const firstInput = containerRef.current.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"])'
      );
      if (firstInput && typeof firstInput.focus === 'function') {
        firstInput.focus();
        return;
      }

      const focusable = getFocusableNodes();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // If no interactive elements inside, focus container if it has a tabindex
        if (containerRef.current.hasAttribute('tabindex')) {
          containerRef.current.focus();
        }
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (!containerRef.current || !isTopmostTrap(containerRef.current)) return;

      const focusable = getFocusableNodes();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        // Shift + Tab: reverse cycle
        if (activeEl === first || !containerRef.current.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: forward cycle
        if (activeEl === last || !containerRef.current.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);

      // Remove from trap stack
      const idx = activeTrapStack.indexOf(container);
      if (idx !== -1) {
        activeTrapStack.splice(idx, 1);
      }

      // Restore focus to trigger element if requested and element still exists in DOM
      if (returnFocus && triggerElementRef.current) {
        const trigger = triggerElementRef.current;
        if (document.body.contains(trigger) && typeof trigger.focus === 'function') {
          setTimeout(() => {
            try {
              trigger.focus();
            } catch {
              // Ignore focus errors
            }
          }, 20);
        }
      }
    };
  }, [isOpen, disabled, initialFocusRef, returnFocus]);

  return containerRef;
}

export default useFocusTrap;
