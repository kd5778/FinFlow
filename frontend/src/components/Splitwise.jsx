import React, { useState } from 'react';
import SplitBill from './SplitBill';
import SplitHistory from './SplitHistory';
import '../stylesheets/Transfer.css';

const Splitwise = () => {
  const [tab, setTab] = useState('create');

  return (
    <div className="splitwisePage">
      <div className="homeHeader">
        <h1>💸 Splitwise</h1>
      </div>

      <div className="swTabButtons">
        <button
          className={`swTabBtn ${tab === 'create' ? 'active' : ''}`}
          onClick={() => setTab('create')}
        >
          Create Split
        </button>
        <button
          className={`swTabBtn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Your Splits
        </button>
      </div>

      <div className="swTabContent">
        {tab === 'create' ? <SplitBill /> : <SplitHistory />}
      </div>
    </div>
  );
};

export default Splitwise;
