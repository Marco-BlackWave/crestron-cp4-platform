import { useState } from "react";
import { useApiKey } from "../hooks/useApiKey";

export default function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const { apiKey, setApiKey } = useApiKey();
  const [input, setInput] = useState(apiKey);

  if (apiKey) {
    return <>{children}</>;
  }

  return (
    <div className="gate-backdrop">
      <div className="gate-card">
        <h1>Crestron CP4 Dashboard</h1>
        <p>Enter your API key to continue.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) setApiKey(input.trim());
          }}
        >
          <input
            className="input"
            type="password"
            placeholder="API Key"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button className="button primary" type="submit" style={{ marginTop: 12, width: "100%" }}>
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
