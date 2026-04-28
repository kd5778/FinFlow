import React, { useState, useEffect } from "react";
import TransactionElement from "./TransactionElement";
import axios from "axios";
import { toastTrigger } from "../helpers/helpers";

import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";

const Transactions = ({ currencySymbol }) => {
  const [expanded, setExpanded] = useState([
    false,
    <ExpandMoreOutlinedIcon fontSize="large" />,
  ]);

  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add event listener for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      setRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("transactionComplete", handleTransactionUpdate);

    return () => {
      window.removeEventListener("transactionComplete", handleTransactionUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      // Guard clause: Don't fetch if there is no token yet
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Safely construct the URL to prevent "localhost:4000transaction/" bugs
        const baseURL = import.meta.env.VITE_API_LINK.replace(/\/$/, "");
        
        const { data } = await axios.get(`${baseURL}/transaction/`, {
          headers: {
            token: token,
          },
          withCredentials: true,
        });

        if (data.status === 1) {
          setTransactions(data.results || []);
        } else {
          console.error("Backend Error:", data.reason);
        }
      } catch (error) {
        console.error("Fetch error:", error.response?.data || error.message);
        toastTrigger({
          message: "Failed to load transactions",
          progressColor: "#c90909",
        });
      } finally {
        // Always ensure loading stops, even on an error
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [refreshKey]);

  const toggleExpand = () => {
    setExpanded([
      !expanded[0],
      expanded[0] ? (
        <ExpandMoreOutlinedIcon fontSize="large" />
      ) : (
        <ExpandLessOutlinedIcon fontSize="large" />
      ),
    ]);
  };

  if (isLoading) {
    return <p style={{ textAlign: "center" }}>loading transactions...</p>;
  }

  if (transactions.length === 0) {
    return <p style={{ textAlign: "center" }}>no transactions</p>;
  }

  // Splitting the transactions safely
  const recentTransactions = transactions.slice(0, 4);
  const remainingTransactions = transactions.slice(4);

  return (
    <div className="transactionsMain">
      <div className="transactionsMainHeader">
        <h2>Transactions</h2>
      </div>

      {recentTransactions.map((element, index) => (
        <TransactionElement
          element={element}
          currencySymbol={currencySymbol}
          // Utilizing a safer, guaranteed unique key
          key={`recent-${index}-${element.created}`}
        />
      ))}

      <div
        className={`expandedTransactions ${expanded[0] ? "visible" : "hidden"}`}
      >
        {remainingTransactions.map((element, index) => (
          <TransactionElement
            element={element}
            currencySymbol={currencySymbol}
            key={`remaining-${index}-${element.created}`}
          />
        ))}
      </div>

      {/* Only show the expand button if there are actually remaining transactions to show */}
      {remainingTransactions.length > 0 && (
        <div className="expandContainer">
          <div className="homeIcons" onClick={toggleExpand}>
            {expanded[1]}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;