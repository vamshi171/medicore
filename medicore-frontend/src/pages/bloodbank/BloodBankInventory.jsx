import { useCallback, useEffect, useState } from 'react';
import { bloodBankService, extractError } from '../../services/api.js';
import { Loading, ErrorBanner, EmptyState } from '../../components/ui.jsx';
import { BloodGroupBadge, DomainTabs, Field, Modal } from '../../components/domain.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Droplet, Plus, Trash, Clock } from '../../components/Icons.jsx';

const TABS = [
  { value: 'all', label: 'All stock' },
  { value: 'expiring', label: 'Expiring / expired' },
];

export default function BloodBankInventory() {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ bloodGroup: '', component: '', city: '' });
  const [expiryDays, setExpiryDays] = useState(30);
  const [showLot, setShowLot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    bloodBankService.metadata().then(({ data }) => setMeta(data.data)).catch((err) => setError(extractError(err)));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const request = tab === 'expiring'
      ? bloodBankService.expiring(expiryDays)
      : bloodBankService.inventory({
        bloodGroup: filters.bloodGroup || undefined,
        component: filters.component || undefined,
        city: filters.city || undefined,
      });
    request
      .then(({ data }) => setRows(data.data))
      .catch((err) => setError(extractError(err)))
      .finally(() => setLoading(false));
  }, [tab, expiryDays, filters]);

  useEffect(() => { load(); }, [load]);

  const createLot = async (e) => {
    e.preventDefault();
    setBusy(true); setFormError('');
    const f = new FormData(e.target);
    try {
      await bloodBankService.createLot({
        centerName: f.get('centerName'),
        city: f.get('city'),
        bloodGroup: f.get('bloodGroup'),
        component: f.get('component'),
        unitsAvailable: Number(f.get('unitsAvailable')),
        unitsReserved: Number(f.get('unitsReserved') || 0),
        criticalThreshold: Number(f.get('criticalThreshold') || 3),
        expiryDate: f.get('expiryDate'),
        notes: f.get('notes') || null,
      });
      toast('Stock lot recorded.', 'success');
      setShowLot(false);
      load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (id, delta) => {
    try {
      await bloodBankService.adjustLot(id, delta);
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const discard = async (id) => {
    try {
      await bloodBankService.discardLot(id);
      toast('Lot withdrawn from circulation.', 'success');
      load();
    } catch (err) {
      setError(extractError(err));
    }
  };

  const groupOptions = meta?.bloodGroups || [];
  const componentOptions = meta?.components || [];

  return (
    <div>
      <div className="page-head">
        <h1><Droplet size={22} /> Blood inventory</h1>
        <p>Every stock lot with its expiry date, reservation and critical threshold.</p>
      </div>

      <ErrorBanner message={error} onClose={() => setError('')} />
      <DomainTabs options={TABS} value={tab} onChange={setTab} />

      <div className="card">
        {tab === 'all' ? (
          <div className="filters">
            <Field label="Blood group">
              <select value={filters.bloodGroup} onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}>
                <option value="">Any group</option>
                {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Component">
              <select value={filters.component} onChange={(e) => setFilters({ ...filters, component: e.target.value })}>
                <option value="">Any component</option>
                {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="City">
              <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="e.g. Bengaluru" />
            </Field>
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={() => { setShowLot(true); setFormError(''); }}>
                <Plus size={15} /> New stock lot
              </button>
            </div>
          </div>
        ) : (
          <div className="filters">
            <Field label="Expiring within (days)">
              <input type="number" min="1" max="365" value={expiryDays}
                     onChange={(e) => setExpiryDays(Number(e.target.value) || 30)} />
            </Field>
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-primary" onClick={() => { setShowLot(true); setFormError(''); }}>
                <Plus size={15} /> New stock lot
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? <Loading /> : null}
      {!loading && rows.length === 0 ? (
        <div className="card">
          <EmptyState title="No lots match" hint={tab === 'expiring' ? 'Nothing expires in this window.' : 'Try clearing the filters.'} icon={Droplet} />
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="card">
          <div className="card-title-row"><h3><Clock size={18} /> {rows.length} lot(s)</h3></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Centre</th><th>Group</th><th>Component</th><th>Available</th><th>Reserved</th><th>Threshold</th><th>Expiry</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-strong">{i.centerName}<div className="cell-sub">{i.city}</div></td>
                    <td><BloodGroupBadge label={i.bloodGroupLabel} /></td>
                    <td>{i.componentLabel}</td>
                    <td className="cell-strong">{i.availableUnits}</td>
                    <td>{i.unitsReserved}</td>
                    <td>{i.criticalThreshold}</td>
                    <td>{i.expiryDate}</td>
                    <td>
                      {i.expired ? <span className="badge badge-red"><span className="dot" />Expired</span> : null}
                      {!i.expired && i.critical ? <span className="badge badge-red"><span className="dot" />Low</span> : null}
                      {!i.expired && i.expiringSoon ? <span className="badge badge-amber" style={{ marginLeft: i.critical ? 6 : 0 }}><span className="dot" />Expiring</span> : null}
                      {!i.expired && !i.critical && !i.expiringSoon ? <span className="badge badge-green"><span className="dot" />OK</span> : null}
                    </td>
                    <td className="actions-cell">
                      <button className="btn btn-outline btn-sm" onClick={() => adjust(i.id, 1)}>+1</button>{' '}
                      <button className="btn btn-outline btn-sm" onClick={() => adjust(i.id, -1)}>−1</button>{' '}
                      <button className="btn btn-outline btn-sm" onClick={() => discard(i.id)}><Trash size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {showLot ? (
        <Modal title="Record a stock lot" icon={Droplet} onClose={() => setShowLot(false)} wide>
          <form onSubmit={createLot}>
            <ErrorBanner message={formError} onClose={() => setFormError('')} />
            <div className="form-grid">
              <Field label="Centre"><input name="centerName" required /></Field>
              <Field label="City"><input name="city" defaultValue="Hyderabad" required /></Field>
              <Field label="Blood group">
                <select name="bloodGroup" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {groupOptions.map((g) => <option key={g.name} value={g.name}>{g.label}</option>)}
                </select>
              </Field>
              <Field label="Component">
                <select name="component" required defaultValue="RED_CELLS">
                  {componentOptions.map((c) => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Units available"><input type="number" name="unitsAvailable" min="0" defaultValue="10" required /></Field>
              <Field label="Units reserved"><input type="number" name="unitsReserved" min="0" defaultValue="0" /></Field>
              <Field label="Critical threshold"><input type="number" name="criticalThreshold" min="0" defaultValue="3" /></Field>
              <Field label="Expiry date"><input type="date" name="expiryDate" required /></Field>
            </div>
            <Field label="Notes" hint="optional"><input name="notes" /></Field>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowLot(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Record lot'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
