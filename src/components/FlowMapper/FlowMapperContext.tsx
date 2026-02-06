"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface FlowMapperState {
  url: string;
  email: string;
  password: string;
}

interface FlowMapperContextValue {
  url: string;
  email: string;
  password: string;
  setUrl: (url: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  submit: () => void;
}

const FlowMapperContext = createContext<FlowMapperContextValue | null>(null);

export function FlowMapperProvider({ children }: { children: ReactNode }) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = useCallback(() => {
    // TODO: Crawl logic
    console.log({ url, email, password });
  }, [url, email, password]);

  return (
    <FlowMapperContext.Provider
      value={{
        url,
        email,
        password,
        setUrl,
        setEmail,
        setPassword,
        submit,
      }}
    >
      {children}
    </FlowMapperContext.Provider>
  );
}

export function useFlowMapper() {
  const ctx = useContext(FlowMapperContext);
  if (!ctx) {
    throw new Error("useFlowMapper must be used within FlowMapperProvider");
  }
  return ctx;
}
