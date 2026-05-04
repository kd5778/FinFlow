import React, { useState, useEffect } from "react";
import axios from "axios";
import Loading from "./Loading";
import { useSelector } from "react-redux";
import { selectAccount } from "../store/mainSlice";
import { refreshData } from "../controllers/data";
import { toastTrigger } from "../helpers/helpers";
import Analytics from "./Analytics";


import "../stylesheets/Home.css";
import "../stylesheets/Transfer.css";
import "../stylesheets/Button.css";

const HubContent = () => {
  const account = useSelector(selectAccount) || { balance: 0 };

  const [activeTab, setActiveTab] = useState("market");
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [macroData, setMacroData] = useState(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [buyModal, setBuyModal] = useState(null);
  const [sellModal, setSellModal] = useState(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [sellUnits, setSellUnits] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllCrypto, setShowAllCrypto] = useState(false);
  const [showAllStocks, setShowAllStocks] = useState(false);

  const INR_RATE = 83.5;

  // fetch live crypto prices from CoinGecko (no API key needed)
  const fetchCrypto = async () => {
    try {
      const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,dogecoin,solana,ripple,cardano,polkadot,chainlink,litecoin,avalanche-2&vs_currencies=inr&include_24hr_change=true"
      );
      const formatted = [
        { symbol: "BTC", name: "Bitcoin", price: data.bitcoin?.inr, change: data.bitcoin?.inr_24h_change },
        { symbol: "ETH", name: "Ethereum", price: data.ethereum?.inr, change: data.ethereum?.inr_24h_change },
        { symbol: "SOL", name: "Solana", price: data.solana?.inr, change: data.solana?.inr_24h_change },
        { symbol: "XRP", name: "Ripple", price: data.ripple?.inr, change: data.ripple?.inr_24h_change },
        { symbol: "DOGE", name: "Dogecoin", price: data.dogecoin?.inr, change: data.dogecoin?.inr_24h_change },
        { symbol: "ADA", name: "Cardano", price: data.cardano?.inr, change: data.cardano?.inr_24h_change },
        { symbol: "DOT", name: "Polkadot", price: data.polkadot?.inr, change: data.polkadot?.inr_24h_change },
        { symbol: "LINK", name: "Chainlink", price: data.chainlink?.inr, change: data.chainlink?.inr_24h_change },
        { symbol: "LTC", name: "Litecoin", price: data.litecoin?.inr, change: data.litecoin?.inr_24h_change },
        { symbol: "AVAX", name: "Avalanche", price: data["avalanche-2"]?.inr, change: data["avalanche-2"]?.inr_24h_change },
      ].filter(c => c.price);
      setCryptoData(formatted);
    } catch (err) {
      console.log("Crypto fetch error:", err);
    }
  };

  // fetch stocks using API Ninjas
  const fetchStocks = async () => {
    try {
      const symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "WIPRO", "ICICIBANK", "SBIN", "BHARTIARTL", "ITC", "LT"];
      const results = await Promise.all(
        symbols.map((s) =>
          axios.get(`https://api.api-ninjas.com/v1/stockprice?ticker=${s}.NS`, {
            headers: { "X-Api-Key": import.meta.env.VITE_X_API_KEY },
          }).catch(() => null)
        )
      );
      const formatted = results
        .filter((r) => r && r.data)
        .map((r) => ({
          symbol: r.data.ticker?.replace(".NS", ""),
          name: r.data.name || r.data.ticker,
          price: Math.round(r.data.price * INR_RATE),
          change: r.data["50d_moving_average"]
            ? (((r.data.price - r.data["50d_moving_average"]) / r.data["50d_moving_average"]) * 100).toFixed(2)
            : null,
        }));
      setStockData(formatted);
    } catch (err) {
      console.log("Stock fetch error:", err);
    }
  };

  // fetch macro data
  const fetchMacro = async () => {
    try {
      const countryReq = axios.get(
        "https://api.api-ninjas.com/v1/country?name=India",
        { headers: { "X-Api-Key": import.meta.env.VITE_X_API_KEY } }
      ).catch(() => ({ data: [{ unemployment: 5.4 }] }));

      const inflationReq = axios.get(
        "https://api.api-ninjas.com/v1/inflation?country=India",
        { headers: { "X-Api-Key": import.meta.env.VITE_X_API_KEY } }
      ).catch(() => ({ data: [{ yearly_rate_pct: 5.1 }] }));

      const interestReq = axios.get(
        "https://api.api-ninjas.com/v1/interestrate?name=Indian",
        { headers: { "X-Api-Key": import.meta.env.VITE_X_API_KEY } }
      ).catch(() => ({ data: { central_bank_rates: [{ rate_pct: 6.5, last_updated: new Date().toISOString().split('T')[0] }] } }));

      const [country, inflation, interest] = await Promise.all([countryReq, inflationReq, interestReq]);

      const { unemployment } = country.data[0] || { unemployment: 5.4 };
      const { yearly_rate_pct } = inflation.data[0] || { yearly_rate_pct: 5.1 };
      const { rate_pct, last_updated } = (interest.data.central_bank_rates && interest.data.central_bank_rates[0]) || { rate_pct: 6.5, last_updated: new Date().toISOString().split('T')[0] };

      setMacroData({ unemployment, inflation: yearly_rate_pct, interest: rate_pct, lastUpdated: last_updated || new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.log("Macro fetch error:", err);
    }
  };

  // fetch user portfolio
  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_LINK}portfolio/`,
        { headers: { token }, withCredentials: true }
      );
      if (data.status === 1) setPortfolio(data.results);
      setIsLoadingPortfolio(false);
    } catch (err) {
      console.log("Portfolio fetch error:", err);
      setIsLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([fetchCrypto(), fetchStocks(), fetchMacro()]);
      setIsLoadingMarket(false);
    };
    loadAll();
    fetchPortfolio();

    // auto refresh prices every 30 seconds
    const interval = setInterval(() => {
      fetchCrypto();
      fetchStocks();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return "₹" + Number(price).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatUnits = (units) => {
    return Number(units).toFixed(6);
  };

  // get current price of an asset from live data
  const getLivePrice = (symbol, type) => {
    if (type === "crypto") {
      const found = cryptoData.find((c) => c.symbol === symbol);
      return found ? found.price : 0;
    } else {
      const found = stockData.find((s) => s.symbol === symbol);
      return found ? found.price : 0;
    }
  };

  // calculate portfolio total value
  const getPortfolioValue = () => {
    return portfolio.reduce((total, item) => {
      const livePrice = getLivePrice(item.asset_symbol, item.asset_type);
      return total + item.units * livePrice;
    }, 0);
  };

  const getPortfolioCost = () => {
    return portfolio.reduce((total, item) => {
      return total + item.units * item.buy_price;
    }, 0);
  };

  // handle buy
  const handleBuy = async () => {
    if (!buyAmount || isNaN(buyAmount) || Number(buyAmount) <= 0) {
      toastTrigger({ message: "enter a valid amount", progressColor: "#c90909" });
      return;
    }

    const totalCost = Number(buyAmount);
    if (totalCost > account.balance) {
      toastTrigger({ message: "insufficient balance", progressColor: "#c90909" });
      return;
    }

    const units = totalCost / buyModal.price;
    setIsProcessing(true);

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_LINK}portfolio/buy`,
        {
          asset_symbol: buyModal.symbol,
          asset_name: buyModal.name,
          asset_type: buyModal.type,
          units: units,
          buy_price: buyModal.price,
        },
        { headers: { token }, withCredentials: true }
      );

      if (data.status === 1) {
        toastTrigger({ message: `${buyModal.name} purchased successfully`, progressColor: "#007b60" });
        setBuyModal(null);
        setBuyAmount("");
        await refreshData();
        await fetchPortfolio();
      } else {
        toastTrigger({ message: data.reason || "purchase failed", progressColor: "#c90909" });
      }
    } catch (err) {
      toastTrigger({ message: "something went wrong", progressColor: "#c90909" });
    }
    setIsProcessing(false);
  };

  // handle sell
  const handleSell = async () => {
    if (!sellUnits || isNaN(sellUnits) || Number(sellUnits) <= 0) {
      toastTrigger({ message: "enter valid units", progressColor: "#c90909" });
      return;
    }

    const holding = portfolio.find((p) => p.asset_symbol === sellModal.asset_symbol);
    if (!holding || Number(sellUnits) > holding.units) {
      toastTrigger({ message: "not enough units", progressColor: "#c90909" });
      return;
    }

    const livePrice = getLivePrice(sellModal.asset_symbol, sellModal.asset_type);
    setIsProcessing(true);

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_LINK}portfolio/sell`,
        {
          asset_symbol: sellModal.asset_symbol,
          units: Number(sellUnits),
          current_price: livePrice,
        },
        { headers: { token }, withCredentials: true }
      );

      if (data.status === 1) {
        toastTrigger({ message: `${sellModal.asset_symbol} sold successfully`, progressColor: "#007b60" });
        setSellModal(null);
        setSellUnits("");
        await refreshData();
        await fetchPortfolio();
      } else {
        toastTrigger({ message: data.reason || "sale failed", progressColor: "#c90909" });
      }
    } catch (err) {
      toastTrigger({ message: "something went wrong", progressColor: "#c90909" });
    }
    setIsProcessing(false);
  };

  return (
    <div style={{ width: "100%", padding: "1rem" }}>

      {/* Tab buttons */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {["market", "portfolio", "macro", "analytics"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.8rem 2rem",
              borderRadius: "2rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1.4rem",
              background: activeTab === tab ? "var(--primary-color, #007b60)" : "var(--card-bg-alt, #f0f0f0)",
              color: activeTab === tab ? "var(--background-color)" : "var(--text-color, var(--text-color))",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── MARKET TAB ── */}
      {activeTab === "market" && (
        <div>
          {isLoadingMarket ? (
            <Loading />
          ) : (
            <>
              {/* Crypto */}
              <h3 style={{ marginBottom: "1rem", fontSize: "1.6rem" }}>🪙 Crypto</h3>
              {cryptoData.length === 0 && (
                <p style={{ color: "var(--sub-color)", marginBottom: "2rem" }}>unable to load crypto prices</p>
              )}
              {cryptoData.slice(0, showAllCrypto ? cryptoData.length : 5).map((coin) => (
                <div key={coin.symbol} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1.2rem", borderRadius: "1rem", background: "var(--card-bg-alt)",
                  marginBottom: "0.8rem"
                }}>
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{coin.name}</p>
                    <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>{coin.symbol}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{formatPrice(coin.price)}</p>
                    {coin.change !== undefined && (
                      <p style={{ color: coin.change >= 0 ? "#007b60" : "#c90909", fontSize: "1.2rem" }}>
                        {coin.change >= 0 ? "▲" : "▼"} {Math.abs(Number(coin.change)).toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setBuyModal({ ...coin, type: "crypto" }); setBuyAmount(""); }}
                    style={{
                      marginLeft: "1rem", padding: "0.6rem 1.4rem",
                      background: "#007b60", color: "#fff", border: "none",
                      borderRadius: "1rem", cursor: "pointer", fontWeight: "600", fontSize: "1.2rem"
                    }}
                  >
                    Buy
                  </button>
                </div>
              ))}
              {cryptoData.length > 5 && (
                <button
                  onClick={() => setShowAllCrypto(!showAllCrypto)}
                  style={{
                    width: "100%", padding: "1rem", background: "transparent", color: "var(--primary-color)",
                    border: "1px solid var(--primary-color)", borderRadius: "1rem", cursor: "pointer",
                    fontWeight: "600", fontSize: "1.3rem", marginTop: "0.5rem", marginBottom: "2rem"
                  }}
                >
                  {showAllCrypto ? "Show Less" : "Show More"}
                </button>
              )}

              {/* Stocks */}
              <h3 style={{ margin: "2rem 0 1rem", fontSize: "1.6rem" }}>📈 Indian Stocks (NSE)</h3>
              {stockData.length === 0 && (
                <p style={{ color: "var(--sub-color)" }}>unable to load stock prices</p>
              )}
              {stockData.slice(0, showAllStocks ? stockData.length : 5).map((stock) => (
                <div key={stock.symbol} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1.2rem", borderRadius: "1rem", background: "var(--card-bg-alt)",
                  marginBottom: "0.8rem"
                }}>
                  <div>
                    <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{stock.symbol}</p>
                    <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>{stock.name}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{formatPrice(stock.price)}</p>
                    {stock.change !== null && (
                      <p style={{ color: Number(stock.change) >= 0 ? "#007b60" : "#c90909", fontSize: "1.2rem" }}>
                        {Number(stock.change) >= 0 ? "▲" : "▼"} {Math.abs(stock.change)}%
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setBuyModal({ ...stock, type: "stock" }); setBuyAmount(""); }}
                    style={{
                      marginLeft: "1rem", padding: "0.6rem 1.4rem",
                      background: "#007b60", color: "#fff", border: "none",
                      borderRadius: "1rem", cursor: "pointer", fontWeight: "600", fontSize: "1.2rem"
                    }}
                  >
                    Buy
                  </button>
                </div>
              ))}
              {stockData.length > 5 && (
                <button
                  onClick={() => setShowAllStocks(!showAllStocks)}
                  style={{
                    width: "100%", padding: "1rem", background: "transparent", color: "var(--primary-color)",
                    border: "1px solid var(--primary-color)", borderRadius: "1rem", cursor: "pointer",
                    fontWeight: "600", fontSize: "1.3rem", marginTop: "0.5rem"
                  }}
                >
                  {showAllStocks ? "Show Less" : "Show More"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === "portfolio" && (
        <div>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.6rem" }}>My Portfolio</h3>

          {isLoadingPortfolio ? (
            <Loading />
          ) : portfolio.length === 0 ? (
            <p style={{ color: "var(--sub-color)", textAlign: "center", padding: "2rem" }}>
              no assets yet — buy something from the market tab
            </p>
          ) : (
            <>
              {/* Summary */}
              <div style={{
                background: "var(--card-bg)", borderRadius: "1rem", padding: "1.5rem",
                marginBottom: "2rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem"
              }}>
                <div>
                  <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>Total Invested</p>
                  <p style={{ fontWeight: "700", fontSize: "1.6rem" }}>{formatPrice(getPortfolioCost())}</p>
                </div>
                <div>
                  <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>Current Value</p>
                  <p style={{ fontWeight: "700", fontSize: "1.6rem" }}>{formatPrice(getPortfolioValue())}</p>
                </div>
                <div>
                  <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>Profit / Loss</p>
                  <p style={{
                    fontWeight: "700", fontSize: "1.6rem",
                    color: getPortfolioValue() - getPortfolioCost() >= 0 ? "#007b60" : "#c90909"
                  }}>
                    {getPortfolioValue() - getPortfolioCost() >= 0 ? "+" : ""}
                    {formatPrice(getPortfolioValue() - getPortfolioCost())}
                  </p>
                </div>
              </div>

              {/* Holdings */}
              {portfolio.map((item) => {
                const livePrice = getLivePrice(item.asset_symbol, item.asset_type);
                const currentValue = item.units * livePrice;
                const invested = item.units * item.buy_price;
                const pnl = currentValue - invested;

                return (
                  <div key={item.id} style={{
                    padding: "1.2rem", borderRadius: "1rem", background: "var(--card-bg-alt)",
                    marginBottom: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div>
                      <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{item.asset_name}</p>
                      <p style={{ color: "var(--sub-color)", fontSize: "1.2rem" }}>
                        {formatUnits(item.units)} units · bought @ {formatPrice(item.buy_price)}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: "700", fontSize: "1.4rem" }}>{formatPrice(currentValue)}</p>
                      <p style={{ color: pnl >= 0 ? "#007b60" : "#c90909", fontSize: "1.2rem" }}>
                        {pnl >= 0 ? "+" : ""}{formatPrice(pnl)}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSellModal(item); setSellUnits(""); }}
                      style={{
                        marginLeft: "1rem", padding: "0.6rem 1.4rem",
                        background: "#c90909", color: "#fff", border: "none",
                        borderRadius: "1rem", cursor: "pointer", fontWeight: "600", fontSize: "1.2rem"
                      }}
                    >
                      Sell
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── MACRO TAB ── */}
      {activeTab === "macro" && (
        <div>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.6rem" }}>🇮🇳 Indian Macroeconomic Data</h3>
          {!macroData ? (
            <p style={{ color: "var(--sub-color)" }}>unable to load macroeconomic data</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', borderRadius: '1.6rem', padding: '2rem', color: '#fff', boxShadow: '0 8px 24px rgba(30,60,114,0.2)' }}>
                <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👥 Unemployment
                </p>
                <p style={{ fontSize: '3rem', fontWeight: '800' }}>{macroData.unemployment}%</p>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)', borderRadius: '1.6rem', padding: '2rem', color: '#fff', boxShadow: '0 8px 24px rgba(255,126,95,0.2)' }}>
                <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📈 YoY Inflation
                </p>
                <p style={{ fontSize: '3rem', fontWeight: '800' }}>{macroData.inflation}%</p>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)', borderRadius: '1.6rem', padding: '2rem', color: '#fff', boxShadow: '0 8px 24px rgba(0,180,219,0.2)' }}>
                <p style={{ fontSize: '1.3rem', opacity: 0.9, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🏦 RBI Interest
                </p>
                <p style={{ fontSize: '3rem', fontWeight: '800' }}>{macroData.interest}%</p>
              </div>

              <div style={{ background: 'var(--card-bg-alt)', borderRadius: '1.6rem', padding: '2rem', color: 'var(--text-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--input-border, #eee)' }}>
                <p style={{ fontSize: '1.2rem', color: 'var(--sub-color)', marginBottom: '0.5rem' }}>Last Updated</p>
                <p style={{ fontSize: '1.4rem', fontWeight: '600', textAlign: 'center' }}>{macroData.lastUpdated}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.6rem" }}>📊 Spending Analytics</h3>
          <Analytics />
        </div>
      )}

      {/* ── BUY MODAL ── */}
      {buyModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "var(--background-color)", borderRadius: "2rem", padding: "3rem",
            width: "90%", maxWidth: "400px"
          }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.8rem" }}>Buy {buyModal.name}</h3>
            <p style={{ color: "var(--sub-color)", marginBottom: "0.5rem", fontSize: "1.3rem" }}>
              Current price: {formatPrice(buyModal.price)}
            </p>
            <p style={{ color: "var(--sub-color)", marginBottom: "1.5rem", fontSize: "1.3rem" }}>
              Your balance: {formatPrice(account.balance)}
            </p>
            <input
              type="number"
              placeholder="Enter amount in ₹"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              style={{
                width: "100%", padding: "1rem", borderRadius: "1rem",
                border: "1px solid var(--input-border, #ddd)", fontSize: "1.4rem", marginBottom: "0.8rem",
                background: "var(--input-bg)", color: "var(--text-color)"
              }}
            />
            {buyAmount && buyModal.price && (
              <p style={{ color: "var(--sub-color)", fontSize: "1.2rem", marginBottom: "1rem" }}>
                You will get: {(Number(buyAmount) / buyModal.price).toFixed(8)} {buyModal.symbol}
              </p>
            )}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleBuy}
                disabled={isProcessing}
                style={{
                  flex: 1, padding: "1rem", background: "#007b60", color: "#fff",
                  border: "none", borderRadius: "1rem", fontWeight: "700",
                  fontSize: "1.4rem", cursor: "pointer"
                }}
              >
                {isProcessing ? "processing..." : "confirm buy"}
              </button>
              <button
                onClick={() => { setBuyModal(null); setBuyAmount(""); }}
                style={{
                  flex: 1, padding: "1rem", background: "var(--card-bg-alt)", color: "var(--text-color)",
                  border: "none", borderRadius: "1rem", fontWeight: "700",
                  fontSize: "1.4rem", cursor: "pointer"
                }}
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SELL MODAL ── */}
      {sellModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "var(--background-color)", borderRadius: "2rem", padding: "3rem",
            width: "90%", maxWidth: "400px"
          }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.8rem" }}>Sell {sellModal.asset_symbol}</h3>
            <p style={{ color: "var(--sub-color)", marginBottom: "0.5rem", fontSize: "1.3rem" }}>
              You own: {formatUnits(sellModal.units)} units
            </p>
            <p style={{ color: "var(--sub-color)", marginBottom: "1.5rem", fontSize: "1.3rem" }}>
              Current price: {formatPrice(getLivePrice(sellModal.asset_symbol, sellModal.asset_type))}
            </p>
            <input
              type="number"
              placeholder="Units to sell"
              value={sellUnits}
              onChange={(e) => setSellUnits(e.target.value)}
              style={{
                width: "100%", padding: "1rem", borderRadius: "1rem",
                border: "1px solid var(--input-border, #ddd)", fontSize: "1.4rem", marginBottom: "0.8rem",
                background: "var(--input-bg)", color: "var(--text-color)"
              }}
            />
            {sellUnits && (
              <p style={{ color: "var(--sub-color)", fontSize: "1.2rem", marginBottom: "1rem" }}>
                You will receive: {formatPrice(
                  Number(sellUnits) * getLivePrice(sellModal.asset_symbol, sellModal.asset_type)
                )}
              </p>
            )}
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleSell}
                disabled={isProcessing}
                style={{
                  flex: 1, padding: "1rem", background: "#c90909", color: "#fff",
                  border: "none", borderRadius: "1rem", fontWeight: "700",
                  fontSize: "1.4rem", cursor: "pointer"
                }}
              >
                {isProcessing ? "processing..." : "confirm sell"}
              </button>
              <button
                onClick={() => { setSellModal(null); setSellUnits(""); }}
                style={{
                  flex: 1, padding: "1rem", background: "var(--card-bg-alt)", color: "var(--text-color)",
                  border: "none", borderRadius: "1rem", fontWeight: "700",
                  fontSize: "1.4rem", cursor: "pointer"
                }}
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HubContent;
