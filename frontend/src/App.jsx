import React, { useEffect, useState } from "react";
import Interface from "./components/Interface";
import Toast from "./components/Toast";
import "./stylesheets/App.css";
import "./stylesheets/components.css";
import theme from "./theme";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_LINK}account/`,
          {
            headers: {
              token: token,
            },
            withCredentials: true,
          }
        );
        if (data.status !== 1) localStorage.removeItem("token");
      } catch (e) {
        console.log(e);
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><h1>Loading...</h1></div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <Toast />
      <Interface />
    </ThemeProvider>
  );
};

export default App;
