import { useCallback, useEffect, useState } from 'react';
import { organService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Sparkle, Users, Heart } from '../../components/Icons.jsx';

export default function TransplantMatches() {
  const toast = useToast();
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    organService.matches({ page: 0, size: 50 })
      .then(({ data }) => setRows(data.data.content))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (id) => {
    try {
      await organService.setMatchStatus(id, { status: 'CONFIRMED' });
      toast('Allocation confirmed.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const withdraw = async (id) => {
    try {
      await organService.setMatchStatus(id, { status: 'WITHDRAWN' });
      toast('Allocation withdrawn.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const complete = async (id) => {
    try {
      await organService.setMatchStatus(id, { status: 'COMPLETED' });
      toast('Allocation completed.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1><Sparkle size={22} /> Allocations</h1>
        <p>ABO-aware ranked matches proposed from the transplant engine and tracked to completion.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card"><EmptyState title="No allocations yet" hint="Propose one from a waiting-list entry." icon={Sparkle} /></div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row">
            <h3><Users size={18} /> {rows.length} allocation(s)</h3>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Organ</th><th>Donor</th><th>Recipient</th><th>Match quality</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="cell-strong">{m.organLabel}</td>
                    <td>{m.donorName}</td>
                    <td>{m.recipientName}</td>
                    <td><span className="badge badge-cyan">{m.compatibilityTier}</span></td>
                    <td><StatusBadge status={m.status} /></td>
                    <td className="actions-cell">
                      {m.status === 'PROPOSED' ? (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => confirm(m.id)}>Confirm</button>
                          <button className="btn btn-outline btn-sm" onClick={() => withdraw(m.id)}>Withdraw</button>
                        </>
                      ) : null}
                      {m.status === 'CONFIRMED' ? (
                        <button className="btn btn-green btn-sm" onClick={() => complete(m.id)}>Complete</button>
                      ) : null}
                      {m.status === 'COMPLETED' || m.status === 'WITHDRAWN' ? <span className="muted">final</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
