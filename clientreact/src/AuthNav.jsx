import React from "react";
import { Home, LogIn, UserPlus } from "lucide-react";
import BrandLogo from "./BrandLogo";

// Left icon sidebar for the login and sign-up screens (same rail as the
// dashboards: icons at rest, labels when hovered).
export default function AuthNav({ go, current }) {
  const items = [
    { id: "", label: "Home", icon: Home },
    { id: "login", label: "Log in", icon: LogIn },
    { id: "signup", label: "Sign up", icon: UserPlus },
  ];

  return (
    <aside className="glass sidebar auth-side">
      <BrandLogo onLight />
      <hr className="divider" />
      <nav className="nav-menu">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => go(id)}
            className={`nav-link ${current === id ? "active" : ""}`}
            aria-current={current === id ? "page" : undefined}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
