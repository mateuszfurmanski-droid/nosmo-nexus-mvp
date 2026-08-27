import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import JobControlApp from "../../../job-control/src/App";
import jobControlCss from "../../../job-control/src/styles.css?inline";

const shadowHostCss = `
  :host {
    display: block;
    min-height: 100vh;
    background: #101010;
    --bg: #101010;
    --panel: #181818;
    --panel-2: #202020;
    --border: #303030;
    --text: #f4f4f1;
    --muted: #9e9e96;
    --yellow: #f1c40f;
    --yellow-soft: #2c270d;
    --green: #80d99a;
    --red: #ff8a80;
    --blue: #8ebeff;
    color: #f4f4f1;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
`;

export default function JobControlPreview() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.replaceChildren();

    const style = document.createElement("style");
    style.textContent = shadowHostCss + jobControlCss;

    const mount = document.createElement("div");
    mount.setAttribute("data-job-control-root", "true");

    shadow.append(style, mount);
    const root = createRoot(mount);
    rootRef.current = root;
    root.render(<JobControlApp />);

    return () => {
      root.unmount();
      rootRef.current = null;
      shadow.replaceChildren();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="job-control-shadow-host"
      style={{ minHeight: "100vh", width: "100%", background: "#101010" }}
    />
  );
}
