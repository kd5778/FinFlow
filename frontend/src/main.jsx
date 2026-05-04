import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./stylesheets/index.css";
import { ThemeProvider } from "@mui/system";
import theme from "./theme.js";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store.js";
import { createRoot } from "react-dom/client";

// Apply saved theme before React mounts to prevent flash
const savedTheme = localStorage.getItem("finflow-theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

const container = document.getElementById("root");
const root = createRoot(
  container,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// add event listener on the container 
// for any clicks or mouse events 

// setting up Router, theme, provider for store

root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Provider store={store}>
          <App />
        </Provider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
