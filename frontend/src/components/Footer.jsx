import React from "react";
import { useDispatch } from "react-redux";
import { setScreenMode } from "../store/mainSlice";
import { useNavigate } from "react-router-dom";

// importing stylesheets
import "../stylesheets/MainTemplate.css";
import "../stylesheets/AltTemplate.css";

// mui stuff import
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import SwapVerticalCircleIcon from "@mui/icons-material/SwapVerticalCircle";
import CallSplitIcon from "@mui/icons-material/CallSplit";

// footer component
const Footer = (props) => {
  const { footerVisibility } = props;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleNav = (screenMode, path) => {
    dispatch(setScreenMode(screenMode));
    navigate(path);
  };

  return (
    <>
      <div
        className={
          `mainComponentFooter ` + `${footerVisibility ? "" : "altFooter"}`
        }
      >
        {/* Home */}
        <div className="section" onClick={() => handleNav("home", "/main")} id="home">
          <div className="sectionIcon">
            <HomeOutlinedIcon
              sx={{ padding: "0rem", margin: "0", width: "3rem", height: "3rem" }}
              fontSize="large"
            />
          </div>
          <div>
            <p className="sectionText">home</p>
          </div>
        </div>

        {/* Transfer — centre button */}
        <div className="section central" onClick={() => handleNav("transfer", "/transfer")} id="transfer">
          <div className="sectionIcon">
            <SwapVerticalCircleIcon
              sx={{ padding: "0rem", margin: "0", width: "4rem", height: "4rem" }}
              fontSize="large"
            />
          </div>
          <div>
            <p className="sectionText">transfer</p>
          </div>
        </div>

        {/* Hub */}
        <div className="section" id="hub" onClick={() => handleNav("hub", "/main")}>
          <div className="sectionIcon">
            <DashboardOutlinedIcon
              sx={{ padding: "0rem", margin: "0", width: "3rem", height: "3rem" }}
              fontSize="large"
            />
          </div>
          <div>
            <p className="sectionText">hub</p>
          </div>
        </div>

        {/* Splitwise */}
        <div className="section" id="splitwise" onClick={() => handleNav("splitwise", "/splitwise")}>
          <div className="sectionIcon">
            <CallSplitIcon
              sx={{ padding: "0rem", margin: "0", width: "3rem", height: "3rem" }}
              fontSize="large"
            />
          </div>
          <div>
            <p className="sectionText">splitwise</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
