import React from "react";
import { Link } from "react-router";

const Home = () => {
  return (
    <div>
      <h1>Home</h1>
      <p>This is a public page</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
};

export default Home;
