import React, { useState, useEffect } from "react";
import Name from "./Name";
import Menu from "./Menu";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setToast,
  setScreenMode,
  selectScreenMode,
  setAccount,
  selectAccount,
} from "../store/mainSlice";
import Loading from "./Loading";
import { toastTrigger } from "../helpers/helpers";

// importing stylesheets
import logo from "../assets/logos/Logo7.svg";
import "../stylesheets/MainTemplate.css";

// mui stuff import
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import Footer from "./Footer";

const MainTemplate = (props) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisibility, setMenuVisibility] = useState(false);
  const account = useSelector(selectAccount);

  const { component } = props;
  const dispatch = useDispatch();

  useEffect(() => {
    setTimeout(() => {
      dispatch(setScreenMode(0));
    }, 1500);

    const fetchData = async () => {
      const token = localStorage.getItem("token");

      // FIX 1: Check if the token exists before making the request.
      // If it doesn't, redirect to login immediately.
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const { data } = await axios.get(
          `${import.meta.env.VITE_API_LINK}account/`,
          {
            headers: {
              token: token, 
              // Note: Most standard APIs use 'Authorization: `Bearer ${token}`'
              // Only use 'token: token' if your specific backend is configured to look for that exact header key.
            },
            withCredentials: true,
          }
        );

        if (data.status === 0) {
          console.log("Error:", data.reason);
          navigate("/login");
          return;
        }

        setIsLoading(false);

        const {
          account_name,
          account_number,
          balance,
          currency_code,
          currency_country,
          currency_name,
          currency_symbol,
          ifsc_code,
          first_name,
          last_name,
          dob,
          number,
        } = data.result;

        const newAccount = {
          ...account,
          name: account_name,
          account_name,
          accountNumber: account_number,
          balance,
          currencyCode: currency_code,
          currencyName: currency_name,
          currencyCountry: currency_country,
          currencySymbol: currency_symbol,
          sortCode: ifsc_code,
          firstName: first_name,
          lastName: last_name,
          dob,
          phoneNumber: number,
        };

        dispatch(setAccount(newAccount));

      } catch (e) {
        console.log(e);

        // FIX 2: Catch the 401 Unauthorized error explicitly.
        // Clear the invalid token and kick the user back to the login screen.
        if (e.response && e.response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          toastTrigger({
            message: "Something has gone wrong",
            progressColor: "#c90909",
          });
        }
      }
    };

    fetchData();
  }, [account.balance, navigate, dispatch]); // Added missing dependencies to the array

  const onMenuClick = () => {
    dispatch(setScreenMode(0));
    setMenuVisibility(!menuVisibility);
  };

  const onClick = (e) => {
    dispatch(setScreenMode(e.currentTarget.id));
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <div className="mainComponent">
        <div className="mainComponentHeader">
          <Link to="/main" className="mainLogoLink" id="home" onClick={onClick}>
            <div className="mainComponentLogoContainer">
              <div className="mainComponentLogo">
                <img src={logo} alt="logo" className="logo" />
              </div>
              <Name />
            </div>
          </Link>

          <div className="mainControls">
            <div onClick={onMenuClick} id="profile">
              <button className="mainControlsButton">
                <AccountCircleRoundedIcon
                  sx={{
                    padding: "0rem",
                    margin: "0",
                    width: "3.5rem",
                    height: "3.5rem",
                  }}
                  color="primary"
                  fontSize="large"
                ></AccountCircleRoundedIcon>{" "}
              </button>
            </div>
          </div>
          <Menu visibility={menuVisibility} onClick={onMenuClick} />
        </div>

        <div className="mainSubComponent">
          <div className="mainBoxWrapper">
            <div className="mainComponentBox">{component}</div>
          </div>
          <div className="placeholder"></div>
        </div>

        <Footer footerVisibility={true} />
      </div>
    </>
  );
};

export default MainTemplate;