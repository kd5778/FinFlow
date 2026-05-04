import React, { useState, useEffect } from "react";
import axios from "axios";
import Loading from "./Loading";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CATEGORY_CONFIG = {
  "Food & Dining":      { emoji: "🍔", color: "#FF6B6B" },
  "Rent & Housing":     { emoji: "🏠", color: "#4ECDC4" },
  "Shopping":           { emoji: "🛍️", color: "#45B7D1" },
  "Transport":          { emoji: "🚗", color: "#96CEB4" },
  "Bills & Utilities":  { emoji: "💡", color: "#FFEAA7" },
  "Entertainment":      { emoji: "🎬", color: "#DDA0DD" },
  "Healthcare":         { emoji: "🏥", color: "#98D8C8" },
  "Education":          { emoji: "📚", color: "#F7DC6F" },
  "Investments":        { emoji: "📈", color: "#82E0AA" },
  "Other":              { emoji: "💰", color: "#AEB6BF" },
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = CATEGORY_CONFIG[data.category] || CATEGORY_CONFIG["Other"];
    return (
      <div
        style={{
          background: "var(--background-color)",
          border: "none",
          borderRadius: "1.2rem",
          padding: "1.2rem 1.6rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          fontSize: "1.3rem",
        }}
      >
        <p style={{ fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-color)" }}>
          {config.emoji} {data.category}
        </p>
        <p style={{ color: "#007b60", fontWeight: "600" }}>
          ₹{Number(data.total).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        const baseURL = import.meta.env.VITE_API_LINK.replace(/\/$/, "");
        const { data } = await axios.get(`${baseURL}/transaction/analytics`, {
          headers: { token },
          withCredentials: true,
        });
        if (data.status === 1) {
          setAnalyticsData(data.results || []);
        }
      } catch (err) {
        console.log("Analytics fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();

    // Listen for new transactions to refresh the chart
    const handleRefresh = () => {
      setIsLoading(true);
      fetchAnalytics();
    };
    window.addEventListener("transactionComplete", handleRefresh);
    return () => window.removeEventListener("transactionComplete", handleRefresh);
  }, []);

  const totalSpent = analyticsData.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

  if (isLoading) return <Loading />;

  if (analyticsData.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <p style={{ fontSize: "4rem", marginBottom: "1rem" }}>📊</p>
        <p
          style={{
            color: "var(--sub-color)",
            fontSize: "1.4rem",
            fontWeight: "500",
          }}
        >
          no spending data yet — make some payments to see your analytics
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #007b60 0%, #00a37a 100%)",
          borderRadius: "1.6rem",
          padding: "2rem",
          marginBottom: "2rem",
          color: "#fff",
        }}
      >
        <p style={{ fontSize: "1.2rem", opacity: 0.85, marginBottom: "0.4rem" }}>
          Total Spending
        </p>
        <p style={{ fontSize: "2.4rem", fontWeight: "800" }}>
          ₹
          {totalSpent.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p style={{ fontSize: "1.1rem", opacity: 0.7, marginTop: "0.4rem" }}>
          across {analyticsData.length} {analyticsData.length === 1 ? "category" : "categories"}
        </p>
      </div>

      {/* Bar Chart */}
      <div
        style={{
          background: "var(--card-bg-alt)",
          borderRadius: "1.6rem",
          padding: "1.5rem 0.5rem 1.5rem 0",
          marginBottom: "2rem",
        }}
      >
        <h4
          style={{
            fontSize: "1.4rem",
            fontWeight: "700",
            marginBottom: "1.5rem",
            paddingLeft: "1.5rem",
            color: "var(--text-color)",
          }}
        >
          Spending by Category
        </h4>
        <ResponsiveContainer width="100%" height={Math.max(250, analyticsData.length * 50)}>
          <BarChart
            data={analyticsData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: "var(--sub-color)" }}
              tickFormatter={(val) => `₹${val.toLocaleString("en-IN")}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="category"
              type="category"
              tick={{ fontSize: 12, fill: "#555", fontWeight: 500 }}
              width={120}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => {
                const config = CATEGORY_CONFIG[val] || CATEGORY_CONFIG["Other"];
                return `${config.emoji} ${val}`;
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,123,96,0.05)" }} />
            <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={28}>
              {analyticsData.map((entry, index) => {
                const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG["Other"];
                return <Cell key={`cell-${index}`} fill={config.color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown List */}
      <div>
        <h4
          style={{
            fontSize: "1.4rem",
            fontWeight: "700",
            marginBottom: "1rem",
            color: "var(--text-color)",
          }}
        >
          Breakdown
        </h4>
        {analyticsData.map((item) => {
          const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG["Other"];
          const percentage = ((Number(item.total) / totalSpent) * 100).toFixed(1);
          return (
            <div
              key={item.category}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.2rem 1.4rem",
                borderRadius: "1.2rem",
                background: "var(--card-bg-alt)",
                marginBottom: "0.6rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span
                  style={{
                    width: "3.6rem",
                    height: "3.6rem",
                    borderRadius: "1rem",
                    background: `${config.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.6rem",
                  }}
                >
                  {config.emoji}
                </span>
                <div>
                  <p style={{ fontWeight: "600", fontSize: "1.3rem", color: "var(--text-color)" }}>
                    {item.category}
                  </p>
                  <p style={{ fontSize: "1.1rem", color: "var(--sub-color)" }}>{percentage}% of total</p>
                </div>
              </div>
              <p style={{ fontWeight: "700", fontSize: "1.4rem", color: "var(--text-color)" }}>
                ₹
                {Number(item.total).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Analytics;
