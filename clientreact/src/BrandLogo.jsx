import React from "react";

const MAUVE = "#ffffff";
const PLUM = "#1a2a5e";

// SRI.CR mark: rounded square with a team (two people) glyph, beside the wordmark.
export function LogoMark({ size = 40, onLight = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="SRI.CR logo"
      style={{ flexShrink: 0 }}>
      <rect width="40" height="40" rx="10" fill={onLight ? PLUM : MAUVE} />
      <circle cx="29" cy="14.5" r="3.6" fill="#ff2d8f" />
      <path d="M26.5 21.5C31.5 21 35 23.5 35 29.5H28C28 26 27.5 23.5 26.5 21.5Z" fill="#ff2d8f" />
      <circle cx="17.5" cy="14" r="5" fill={onLight ? MAUVE : PLUM} />
      <path d="M7.5 30C7.5 24 11.5 21.5 17.5 21.5S27.5 24 27.5 30Z" fill={onLight ? MAUVE : PLUM} />
    </svg>
  );
}

export default function BrandLogo({ size = 40, caption = "User management", spaced = true, onLight = false }) {
  return (
    <div className="brand-logo" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: spaced ? "22px" : 0 }}>
      <LogoMark size={size} onLight={onLight} />
      <div className="brand-text" style={{ lineHeight: 1.15 }}>
        <div
          style={{
            fontSize: `${size * 0.6}px`,
            fontWeight: 700,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}>
          <span style={{ color: onLight ? "#1a2a5e" : MAUVE }}>SRI</span>
          <span style={{ color: onLight ? "#ff2d8f" : "#ffc9e3" }}>.CR</span>
        </div>
        {caption && (
          <div style={{ fontSize: "0.65rem", opacity: 0.65, letterSpacing: "0.04em" }}>
            {caption}
          </div>
        )}
      </div>
    </div>
  );
}
