import React, { useState, useEffect } from "react";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("finflow-theme");
    return saved === "dark";
  });

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("finflow-theme", theme);
  }, [isDark]);

  // Apply saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("finflow-theme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.8rem 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {isDark ? (
          <DarkModeOutlinedIcon style={{ color: "var(--primary-color)" }} />
        ) : (
          <LightModeOutlinedIcon style={{ color: "var(--primary-color)" }} />
        )}
        <div>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 500 }}>
            {isDark ? "dark mode" : "light mode"}
          </h3>
          <p style={{ fontSize: "1.1rem", color: "var(--sub-color)" }}>
            switch between light and dark theme
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => setIsDark(!isDark)}
        aria-label="Toggle dark mode"
        style={{
          position: "relative",
          width: "5.2rem",
          height: "2.8rem",
          borderRadius: "5rem",
          border: "none",
          cursor: "pointer",
          background: isDark
            ? "var(--primary-color)"
            : "var(--hover-color)",
          transition: "background 0.3s ease",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "0.3rem",
            left: isDark ? "2.7rem" : "0.3rem",
            width: "2.2rem",
            height: "2.2rem",
            borderRadius: "50%",
            background: isDark ? "#121212" : "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.3s ease, background 0.3s ease",
          }}
        />
      </button>
    </div>
  );
};

export default ThemeToggle;
