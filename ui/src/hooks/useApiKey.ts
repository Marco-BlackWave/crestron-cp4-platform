import { createContext, useContext } from "react";

export interface ApiKeyContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const ApiKeyContext = createContext<ApiKeyContextValue>({
  apiKey: "",
  setApiKey: () => {},
});

export function useApiKey(): ApiKeyContextValue {
  return useContext(ApiKeyContext);
}
