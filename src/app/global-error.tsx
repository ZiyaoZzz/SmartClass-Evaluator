"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", textAlign: "center", fontFamily: "system-ui" }}>
          <h2>Something went wrong</h2>
          <p style={{ margin: "1rem 0", color: "#666" }}>{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
