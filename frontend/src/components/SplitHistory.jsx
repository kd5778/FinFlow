import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Loading from './Loading';
import { toastTrigger } from '../helpers/helpers';
import '../stylesheets/Transfer.css';

const SplitHistory = () => {
  const [splits, setSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(null);

  const token = localStorage.getItem('token');
  const apiLink = import.meta.env.VITE_API_LINK;

  useEffect(() => {
    loadSplits();
  }, []);

  const loadSplits = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${apiLink}split/list`, {
        headers: { token },
        withCredentials: true,
      });
      if (data.status === 1) {
        setSplits(data.results);
      }
    } catch (err) {
      console.error('Failed to load splits');
    } finally {
      setLoading(false);
    }
  };

  const settleShare = async (shareId) => {
    setSettling(shareId);
    try {
      const { data } = await axios.post(
        `${apiLink}split/settle/${shareId}`,
        {},
        { headers: { token }, withCredentials: true }
      );
      if (data.status === 1) {
        toastTrigger({ message: 'Share settled successfully!', progressColor: '#007b60' });
        loadSplits();
      } else {
        toastTrigger({ message: data.reason || 'Settle failed', progressColor: '#c90909' });
      }
    } catch (err) {
      toastTrigger({ message: 'Network error. Please try again.', progressColor: '#c90909' });
    }
    setSettling(null);
  };

  if (loading) return <Loading />;

  return (
    <div className="splitHistory">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.6rem' }}>Your Splits</h3>
        <button className="swRefreshBtn" onClick={loadSplits}>↻ Refresh</button>
      </div>

      {splits.length === 0 ? (
        <div className="swEmptyState">
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💸</p>
          <p style={{ color: 'gray', fontSize: '1.3rem' }}>No open splits yet.</p>
          <p style={{ color: 'gray', fontSize: '1.2rem' }}>Create one from the <em>Create Split</em> tab.</p>
        </div>
      ) : (
        splits.map((split) => {
          const settledCount = Number(split.settled_count) || 0;
          const shareCount = Number(split.share_count) || 0;
          const isFullySettled = settledCount >= shareCount && shareCount > 0;
          const myShare = split.my_share;

          return (
            <div key={split.id} className="swSplitCard">
              <div className="swSplitCardHeader">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <h4 className="swSplitTitle" style={{ margin: 0 }}>Split #{split.id}</h4>
                    <span className="swRoleBadge">{split.is_creator ? '👑 Creator' : '👤 Participant'}</span>
                  </div>
                  <p className="swSplitDesc">{split.description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="swSplitTotal">
                    ₹{Number(split.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                  <span className={`swStatusBadge ${isFullySettled ? 'settled' : 'open'}`}>
                    {isFullySettled ? '✓ Fully Settled' : `${settledCount}/${shareCount} settled`}
                  </span>
                </div>
              </div>

              {/* My share settle button (for participants) */}
              {myShare && !myShare.settled && (
                <div className="swMyShareBanner">
                  <span>Your share: <strong>₹{Number(myShare.share_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                  <button
                    className="swSettleBtn"
                    onClick={() => settleShare(myShare.id)}
                    disabled={settling === myShare.id}
                  >
                    {settling === myShare.id ? 'Settling...' : '💳 Pay My Share'}
                  </button>
                </div>
              )}
              {myShare && myShare.settled && (
                <div className="swMyShareBanner settled">
                  <span>✓ Your share of ₹{Number(myShare.share_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} is settled</span>
                </div>
              )}

              {/* All shares table */}
              <div className="swSharesTable">
                <div className="swSharesTableHead">
                  <span>Participant</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span></span>
                </div>
                {(split.shares || []).map((share) => (
                  <div key={share.id} className="swSharesTableRow">
                    <span className="swShareName">
                      {share.account_name || share.account_number || 'Unknown'}
                    </span>
                    <span className="swShareAmt">
                      ₹{Number(share.share_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`swShareStatus ${share.settled ? 'settled' : 'pending'}`}>
                      {share.settled ? '✓ Settled' : '⏳ Pending'}
                    </span>
                    <span>
                      {/* Creator can see settle buttons for all shares */}
                      {split.is_creator && !share.settled && share.user_id !== split.creator_id && (
                        <button
                          className="swSettleBtn"
                          style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}
                          onClick={() => settleShare(share.id)}
                          disabled={settling === share.id}
                        >
                          {settling === share.id ? '...' : 'Mark Paid'}
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default SplitHistory;
