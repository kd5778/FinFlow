import React from "react";
import ArrowCircleUpOutlinedIcon from "@mui/icons-material/ArrowCircleUpOutlined";
import ArrowCircleDownOutlinedIcon from "@mui/icons-material/ArrowCircleDownOutlined";

const TransactionElement = ({ element, currencySymbol = "$" }) => {
  if (!element) return null;

  // 1. Determine the transaction type once
  const isSent = element.type?.toLowerCase() === "sent";
  
  // 2. Set our professional color palette (Deep Red for sent, Emerald Green for received)
  const transactionColor = isSent ? "#d32f2f" : "#2e7d32";
  
  // 3. Set the math prefix
  const mathPrefix = isSent ? "-" : "+";

  const formatDate = (sqlTimestamp) => {
    if (!sqlTimestamp) return "Date unknown";
    
    try {
      const date = new Date(sqlTimestamp);
      if (isNaN(date.getTime())) return "Invalid Date";

      // 1. Format the Date (DD/MM/YYYY)
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      // 2. Format the Time (12-hour clock with AM/PM)
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      
      hours = hours % 12;
      hours = hours || 12; // Converts '0' midnight to '12'

      return `${day}/${month}/${year} at ${hours}:${minutes} ${ampm}`;
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatMoney = (amount) => {
    const numericAmount = Number(amount) || 0; 
    const formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(numericAmount);
  };

  return (
    <div className="transactionElement">
      <div className="elementSection">
        {/* Apply the dynamic color to the Material UI Icon */}
        {isSent ? (
          <ArrowCircleUpOutlinedIcon style={{ color: transactionColor }} />
        ) : (
          <ArrowCircleDownOutlinedIcon style={{ color: transactionColor }} />
        )}
      </div>

      <div className="elementSection elementsCentre">
        <div>
          <div className="transactionDetails">
            <h3>{element.details || "Unknown Transaction"}</h3>
          </div>

          <div className="transactionExtra">
            <p style={{ textTransform: "capitalize" }}>{element.type || "transfer"}</p>
            <p>{formatDate(element.created)}</p>
            {element.category && element.category !== "Other" && (
              <span style={{
                display: "inline-block",
                padding: "0.15rem 0.6rem",
                borderRadius: "1rem",
                background: "#007b6012",
                color: "#007b60",
                fontSize: "1rem",
                fontWeight: "600",
              }}>
                {element.category}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="elementSection">
        <div>
          {/* Apply the dynamic color and the +/- prefix to the amount */}
          <h3 style={{ color: transactionColor }}>
            {mathPrefix}{currencySymbol}{formatMoney(element.amount)}
          </h3>
        </div>
      </div>
    </div>
  );
};

export default TransactionElement;