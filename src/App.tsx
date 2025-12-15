import { useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest, tokenRequest } from "./authConfig";

type Agent = { agent_id: string; display_name: string };
type ChatMsg = { role: "user" | "assistant"; text: string };

const API_BASE = import.meta.env.VITE_API_BASE as string;

export default function App() {
  const { instance, accounts } = useMsal();
  const account = useMemo(() => accounts[0], [accounts]);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const signIn = async () => {
    setError("");
    await instance.loginPopup(loginRequest);
  };

  const signOut = async () => {
    await instance.logoutPopup();
    setAgents([]);
    setSelectedAgent("");
    setMessages([]);
  };

  const acquireApiToken = async (): Promise<string> => {
    if (!account) throw new Error("No account signed in");
    try {
      const res = await instance.acquireTokenSilent({ ...tokenRequest, account });
      return res.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        const res = await instance.acquireTokenPopup({ ...tokenRequest, account });
        return res.accessToken;
      }
      throw e;
    }
  };

  const apiFetch = async (path: string, init?: RequestInit) => {
    const token = await acquireApiToken();
    const r = await fetch(`${API_BASE}${path}`, {
      ...(init || {}),
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) throw new Error(`${path} failed (${r.status})`);
    return r.json();
  };

  const loadAgents = async () => {
    setError("");
    const res = await apiFetch("/agents");
    const list = res.agents || [];
    setAgents(list);
    if (list.length > 0) setSelectedAgent(list[0].agent_id);
  };

  useEffect(() => {
    if (account) loadAgents().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedAgent) return;
    const text = input.trim();
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);

    try {
      const res = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ agent_id: selectedAgent, message: text }),
      });
      setMessages((m) => [...m, { role: "assistant", text: res.answer || "(no answer)" }]);
    } catch (e: any) {
      setError(e?.message ?? "Chat failed");
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 900 }}>
      <h2>Foundry Agents Chat</h2>

      {!account ? (
        <button onClick={signIn}>Sign in</button>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <div><b>User:</b> {account.username}</div>
            <button onClick={signOut}>Sign out</button>
            <button onClick={() => loadAgents().catch((e) => setError(e.message))}>Refresh agents</button>
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: 10, border: "1px solid #ccc" }}>
              <b>Error:</b> {error}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label><b>Select agent:</b> </label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>{a.display_name}</option>
              ))}
            </select>
          </div>

          <div style={{ border: "1px solid #ddd", padding: 12, height: 400, overflow: "auto", marginBottom: 12 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <b>{m.role}:</b> {m.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1, padding: 8 }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? sendMessage() : null)}
              placeholder="Type your message…"
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}
