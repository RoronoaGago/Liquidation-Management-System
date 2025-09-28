// context/HelpContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface HelpContextType {
  currentAction: string | null;
  setCurrentAction: (action: string | null) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
  userNeedsHelp: boolean;
  triggerHelp: (action: string) => void;
  dismissHelp: () => void;
  helpHistory: string[];
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [userNeedsHelp, setUserNeedsHelp] = useState(false);
  const [helpHistory, setHelpHistory] = useState<string[]>([]);

  const triggerHelp = useCallback((action: string) => {
    setCurrentAction(action);
    setShowHelp(true);
    setUserNeedsHelp(true);
    setHelpHistory((prev) => [...prev, action]);
  }, []);

  const dismissHelp = useCallback(() => {
    setShowHelp(false);
    setUserNeedsHelp(false);
    setCurrentAction(null);
  }, []);

  const value: HelpContextType = {
    currentAction,
    setCurrentAction,
    showHelp,
    setShowHelp,
    userNeedsHelp,
    triggerHelp,
    dismissHelp,
    helpHistory,
  };

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
};

export const useHelpContext = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error("useHelpContext must be used within a HelpProvider");
  }
  return context;
};

// Hook for components to easily trigger contextual help
export const useHelpTrigger = () => {
  const { triggerHelp } = useHelpContext();

  return useCallback(
    (actionName: string, element?: HTMLElement) => {
      // Optional: Add visual indicator to the element that triggered help
      if (element) {
        element.classList.add("help-highlighted");
        setTimeout(() => element.classList.remove("help-highlighted"), 3000);
      }
      triggerHelp(actionName);
    },
    [triggerHelp]
  );
};
