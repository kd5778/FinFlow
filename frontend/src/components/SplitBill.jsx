import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { selectAccount } from '../store/mainSlice';
import { toastTrigger } from '../helpers/helpers';
import Button from './Button';
import Loading from './Loading';
import '../stylesheets/Transfer.css';

// Search input with dropdown for finding users
const ParticipantSearch = ({ index, share, onSelect, onRemove, showRemove, equalSplit, equalAmount, isSelf }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const token = localStorage.getItem('token');
  const apiLink = import.meta.env.VITE_API_LINK;
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (share.selected) onSelect(index, null);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setResults([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await axios.get(`${apiLink}user/search?q=${encodeURIComponent(val)}`, {
          headers: { token }, withCredentials: true,
        });
        if (data.status === 1) { setResults(data.results); setShowDropdown(true); }
      } catch (err) { console.error('Search error', err); }
      setSearching(false);
    }, 300);
  };

  const handleSelect = (user) => {
    setQuery(`${user.account_name} — ${user.account_number}`);
    setResults([]);
    setShowDropdown(false);
    onSelect(index, user);
  };

  // Self row — read-only, shows own info
  if (isSelf && share.selected) {
    return (
      <div className="swShareRow swSelfRow">
        <div className="swShareIndex" style={{ background: '#007b60' }}>👤</div>
        <div className="swShareFields" style={{ flexDirection: 'column', gap: '0.4rem' }}>
          <div className="swSelectedUser">
            <span>✓ {share.selected.account_name} <span style={{ background: '#007b60', color: '#fff', fontSize: '1rem', padding: '0.1rem 0.5rem', borderRadius: '0.4rem', marginLeft: '0.4rem' }}>You</span></span>
            <span style={{ color: '#888', fontSize: '1.1rem' }}>
              Acc: {share.selected.account_number} · IFSC: {share.selected.ifsc_code}
            </span>
          </div>
          {equalSplit && <div className="swShareAmount">₹{equalAmount} <span style={{ fontSize: '1rem', fontWeight: 400, marginLeft: '0.5rem', color: '#555' }}>auto-settled</span></div>}
        </div>
        {showRemove && (
          <button type="button" className="swRemoveBtn" onClick={() => onRemove(index)} title="Remove myself">✕</button>
        )}
      </div>
    );
  }

  return (
    <div className="swShareRow" ref={wrapperRef}>
      <div className="swShareIndex">{index + 1}</div>
      <div className="swShareFields" style={{ flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            className="swInput swInputSm"
            placeholder="Search by name, email or phone…"
            value={query}
            onChange={handleQueryChange}
            autoComplete="off"
          />
          {searching && (
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#999' }}>
              Searching…
            </span>
          )}
          {showDropdown && results.length > 0 && (
            <div className="swSearchDropdown">
              {results.map((user) => (
                <div key={user.id} className="swSearchResult" onMouseDown={() => handleSelect(user)}>
                  <div style={{ fontWeight: 600, fontSize: '1.3rem' }}>{user.account_name}</div>
                  <div style={{ color: '#888', fontSize: '1.1rem' }}>{user.email} · Acc: {user.account_number}</div>
                </div>
              ))}
            </div>
          )}
          {showDropdown && results.length === 0 && !searching && (
            <div className="swSearchDropdown">
              <div style={{ padding: '1rem', color: '#999', fontSize: '1.2rem' }}>No users found</div>
            </div>
          )}
        </div>
        {share.selected && (
          <div className="swSelectedUser">
            <span>✓ {share.selected.account_name}</span>
            <span style={{ color: '#888', fontSize: '1.1rem' }}>
              Acc: {share.selected.account_number} · IFSC: {share.selected.ifsc_code}
            </span>
          </div>
        )}
        {share.selected && equalSplit && <div className="swShareAmount">₹{equalAmount}</div>}
      </div>
      {showRemove && (
        <button type="button" className="swRemoveBtn" onClick={() => onRemove(index)} title="Remove participant">✕</button>
      )}
    </div>
  );
};

// ── Main SplitBill component ──────────────────────────────────────────────────
const SplitBill = () => {
  const account = useSelector(selectAccount);

  // Build "self" user object from Redux store
  const selfUser = {
    id: 'self',
    account_name: account.account_name || account.name,
    account_number: account.accountNumber,
    ifsc_code: account.sortCode,
    email: '(you)',
  };

  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [includeSelf, setIncludeSelf] = useState(false);
  const [shares, setShares] = useState([
    { selected: null },
    { selected: null },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [equalSplit, setEqualSplit] = useState(true);
  const [customAmounts, setCustomAmounts] = useState(['', '']);

  const token = localStorage.getItem('token');
  const apiLink = import.meta.env.VITE_API_LINK;

  // Toggle including yourself as a participant
  const handleToggleSelf = (checked) => {
    setIncludeSelf(checked);
    if (checked) {
      // Insert self as the first share
      setShares([{ selected: selfUser, isSelf: true }, ...shares]);
      setCustomAmounts(['', ...customAmounts]);
    } else {
      // Remove the first self share
      const [, ...rest] = shares;
      setShares(rest);
      const [, ...restAmts] = customAmounts;
      setCustomAmounts(restAmts);
    }
  };

  const addShare = () => {
    if (shares.length >= 10) {
      toastTrigger({ message: 'Maximum 10 shares allowed', progressColor: '#c90909' });
      return;
    }
    setShares([...shares, { selected: null }]);
    setCustomAmounts([...customAmounts, '']);
  };

  const removeShare = (index) => {
    const minShares = 2;
    if (shares.length <= minShares) {
      toastTrigger({ message: 'Minimum 2 participants required', progressColor: '#c90909' });
      return;
    }
    // If removing the self row, uncheck includeSelf
    if (shares[index].isSelf) setIncludeSelf(false);
    setShares(shares.filter((_, i) => i !== index));
    setCustomAmounts(customAmounts.filter((_, i) => i !== index));
  };

  const handleSelect = (index, user) => {
    const newShares = [...shares];
    newShares[index] = { ...newShares[index], selected: user };
    setShares(newShares);
  };

  const calcEqualAmount = () => {
    const total = Number(totalAmount) || 0;
    return shares.length > 0 ? (total / shares.length).toFixed(2) : '0.00';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedTotal = Number(totalAmount);

    if (!parsedTotal || parsedTotal <= 0) {
      toastTrigger({ message: 'Enter a valid total amount', progressColor: '#c90909' });
      return;
    }

    const unselected = shares.filter(s => !s.selected);
    if (unselected.length > 0) {
      toastTrigger({ message: 'Please search and select all participants', progressColor: '#c90909' });
      return;
    }

    const equalAmt = Number(calcEqualAmount());

    const shareData = shares.map((s, i) => ({
      account_number: s.selected.account_number,
      ifsc_code: s.selected.ifsc_code,
      share_amount: equalSplit ? equalAmt : Number(customAmounts[i]),
    }));

    if (!equalSplit) {
      const totalShares = shareData.reduce((sum, s) => sum + Number(s.share_amount), 0);
      if (Math.abs(totalShares - parsedTotal) > 0.01) {
        toastTrigger({
          message: `Shares total (₹${totalShares.toFixed(2)}) must equal total (₹${parsedTotal})`,
          progressColor: '#c90909',
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${apiLink}split/create`,
        { total_amount: parsedTotal, description: description.trim() || 'Group split', shares: shareData },
        { headers: { token }, withCredentials: true }
      );

      if (data.status === 1) {
        toastTrigger({ message: `Split #${data.split_id} created successfully!`, progressColor: '#007b60' });
        setTotalAmount('');
        setDescription('');
        setIncludeSelf(false);
        setShares([{ selected: null }, { selected: null }]);
        setCustomAmounts(['', '']);
        setEqualSplit(true);
      } else {
        toastTrigger({ message: data.reason || 'Failed to create split', progressColor: '#c90909' });
      }
    } catch (err) {
      toastTrigger({ message: 'Network error. Please try again.', progressColor: '#c90909' });
    }
    setIsLoading(false);
  };

  const equalAmount = calcEqualAmount();

  return (
    <div className="splitBillContainer">
      <form onSubmit={handleSubmit}>

        {/* Total Amount */}
        <div className="swFieldGroup">
          <label className="swLabel">Total Amount (₹)</label>
          <input
            className="swInput"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 1200"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="swFieldGroup">
          <label className="swLabel">Description (optional)</label>
          <input
            className="swInput"
            type="text"
            placeholder="Dinner at restaurant"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Include myself toggle */}
        <label className="swToggle swToggleHighlight">
          <input
            type="checkbox"
            checked={includeSelf}
            onChange={(e) => handleToggleSelf(e.target.checked)}
          />
          <span>
            Include myself as a participant
            <span className="swToggleHint">Your share is auto-settled since you paid</span>
          </span>
        </label>

        {/* Equal Split Toggle */}
        <label className="swToggle">
          <input
            type="checkbox"
            checked={equalSplit}
            onChange={(e) => setEqualSplit(e.target.checked)}
          />
          <span>Split equally among all participants</span>
        </label>

        {/* Participants */}
        <div className="swSharesList">
          <div className="swSharesHeader">
            <h3>Participants ({shares.length})</h3>
            {totalAmount && equalSplit && (
              <span className="swEqualBadge">Each pays ₹{equalAmount}</span>
            )}
          </div>

          {shares.map((share, index) => (
            <ParticipantSearch
              key={`share-${index}-${share.isSelf ? 'self' : 'other'}`}
              index={index}
              share={share}
              onSelect={handleSelect}
              onRemove={removeShare}
              showRemove={shares.length > 2}
              equalSplit={equalSplit}
              equalAmount={equalAmount}
              isSelf={!!share.isSelf}
            />
          ))}

          {/* Custom amounts (non-equal mode) */}
          {!equalSplit && shares.some(s => s.selected) && (
            <div style={{ marginBottom: '1rem' }}>
              <p className="swLabel" style={{ marginBottom: '0.8rem' }}>Enter custom amounts:</p>
              {shares.map((share, index) => (
                share.selected && (
                  <div key={`amt-${index}`} className="swCustomAmtRow">
                    <span>{share.selected.account_name}{share.isSelf && ' (you)'}</span>
                    {share.isSelf ? (
                      <input
                        className="swInput swInputSm"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Your share (₹)"
                        value={customAmounts[index]}
                        onChange={(e) => {
                          const a = [...customAmounts];
                          a[index] = e.target.value;
                          setCustomAmounts(a);
                        }}
                      />
                    ) : (
                      <input
                        className="swInput swInputSm"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Amount (₹)"
                        value={customAmounts[index]}
                        onChange={(e) => {
                          const a = [...customAmounts];
                          a[index] = e.target.value;
                          setCustomAmounts(a);
                        }}
                      />
                    )}
                  </div>
                )
              ))}
            </div>
          )}

          <button type="button" className="swAddBtn" onClick={addShare}>
            + Add Participant
          </button>
        </div>

        <Button
          text={isLoading ? 'Creating…' : 'Create Split'}
          type="submit"
        />
      </form>

      {/* Info box */}
      <div className="swInfoBox">
        <p><strong>💡 How it works</strong></p>
        <ul>
          <li>Enter the total bill amount</li>
          <li>Toggle <strong>"Include myself"</strong> if you also paid and want a share tracked</li>
          <li>Search other participants by name, email, or phone</li>
          <li>Everyone settles their share from the <em>Your Splits</em> tab</li>
          <li>Your own share is marked auto-settled since you created the split</li>
        </ul>
      </div>
    </div>
  );
};

export default SplitBill;
