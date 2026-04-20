import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import "../stylesheets/Welcome.css";
import Logo from "./Logo";
import Name from "./Name";
import Button from "./Button";

// main landing page

const Welcome = () => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="welcomeContainer">
        {/* We only show the name when the 3 seconds are up */}
        {showContent && (
          <div className="welcomeName fade-in">
            <Name></Name>
          </div>
        )}

        {/* The logo is always there, but it gets the 'spin' class initially */}
        <div className={`welcomeLogo ${!showContent ? 'spin-logo' : ''}`}>
          <Logo></Logo>
        </div>

        {/* We only show the buttons when the 3 seconds are up */}
        {showContent && (
          <div className="welcomeControls fade-in">
            <Link to="/register">
              <Button text={"register"} />
            </Link>

            <Link to="/login">
              <Button text={"login"} type={"secondary"} mode={0} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Welcome;