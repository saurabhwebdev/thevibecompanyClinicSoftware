"use client";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "#EFF2EF",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "28rem",
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  width: "8rem",
                  height: "8rem",
                  borderRadius: "50%",
                  backgroundColor: "rgba(225, 85, 84, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  style={{ width: "4rem", height: "4rem", color: "#E15554" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Message */}
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#232C33",
                marginBottom: "0.75rem",
              }}
            >
              Critical Error
            </h1>
            <p
              style={{
                color: "#5A6570",
                marginBottom: "0.5rem",
              }}
            >
              A critical error occurred. Please refresh the page or try again
              later.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#5A6570",
                  fontFamily: "monospace",
                  marginBottom: "2rem",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}

            {/* Action */}
            <button
              onClick={reset}
              style={{
                backgroundColor: "#4D9DE0",
                color: "#FFFFFF",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                style={{ width: "1rem", height: "1rem" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
