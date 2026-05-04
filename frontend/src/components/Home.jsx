import React from "react";
import "../stylesheets/Home.css";
import Account from "./Account";
import { useSelector } from "react-redux";
import { selectScreenMode } from "../store/mainSlice";

const Home = () => {
  const screenMode = useSelector(selectScreenMode);

  return (
    <div className="mainHomeContainer">
      <div className="homeHeader">
        <h1>Home</h1>
      </div>
      <Account />
    </div>
  );
};

export default Home;
