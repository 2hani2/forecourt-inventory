import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Box,
  CarFront,
  Check,
  ChevronRight,
  CircleHelp,
  Gauge,
  LayoutGrid,
  LogOut,
  PackagePlus,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { api, money, type User, type Vehicle } from './api';
import { CarArt } from './CarArt';
import { Brand } from './components/Brand';
import { Modal } from './components/Modal';
import { Auth } from './components/Auth';
import { VehicleForm } from './components/VehicleForm';
import { VehicleCard } from './components/VehicleCard';
import type { Action } from './actions';

function Dashboard({ user, logout }: { user: User; logout: () => void }) {
  const [all, setAll] = useState<Vehicle[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All vehicles');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [stock, setStock] = useState(false);
  const [lowStock, setLowStock] = useState(false);
  const [sort, setSort] = useState('newest');
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const admin = user.role === 'admin';
  const invalidRange = min !== '' && max !== '' && Number(min) > Number(max);
  useEffect(() => {
    const controller = new AbortController();
    api<{ vehicles: Vehicle[] }>('/vehicles', { signal: controller.signal })
      .then((r) => setAll(r.vehicles))
      .catch(() => {});
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    const timer = setTimeout(async () => {
      if (invalidRange) {
        setLoadError('Minimum price must be less than or equal to maximum price.');
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'All vehicles') params.set('category', category);
      if (min) params.set('minPrice', min);
      if (max) params.set('maxPrice', max);
      if (stock) params.set('inStock', 'true');
      try {
        const result = await api<{ vehicles: Vehicle[] }>('/vehicles/search?' + params, {
          signal: controller.signal,
        });
        setVehicles(result.vehicles);
      } catch (e) {
        if (!controller.signal.aborted) setLoadError((e as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, category, min, max, stock, refresh, invalidRange]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  const shown = useMemo(
    () =>
      [...vehicles]
        .filter((v) => !lowStock || v.quantity <= 2)
        .sort((a, b) =>
          sort === 'price-low'
            ? a.price - b.price
            : sort === 'price-high'
              ? b.price - a.price
              : sort === 'name'
                ? (a.make + a.model).localeCompare(b.make + b.model)
                : b.createdAt.localeCompare(a.createdAt),
        ),
    [vehicles, sort, lowStock],
  );
  function reset() {
    setQuery('');
    setCategory('All vehicles');
    setMin('');
    setMax('');
    setStock(false);
    setLowStock(false);
  }
  function open(value: Action) {
    setActionError('');
    setAction(value);
  }
  async function mutate(body: Record<string, unknown> = {}) {
    if (!action || action.type === 'help' || busy) return;
    setBusy(true);
    setActionError('');
    try {
      const type = action.type;
      const url =
        type === 'edit'
          ? '/vehicles' + (action.vehicle ? '/' + action.vehicle.id : '')
          : `/vehicles/${action.vehicle.id}${type === 'delete' ? '' : '/' + type}`;
      await api(url, {
        method:
          type === 'edit'
            ? action.vehicle
              ? 'PUT'
              : 'POST'
            : type === 'delete'
              ? 'DELETE'
              : 'POST',
        ...(type === 'delete' ? {} : { body: JSON.stringify(body) }),
      });
      setAction(null);
      setRefresh((n) => n + 1);
      setNotice(
        type === 'edit'
          ? 'Vehicle saved to your collection.'
          : type === 'purchase'
            ? 'Purchase complete. Your next chapter awaits.'
            : type === 'restock'
              ? 'Stock updated successfully.'
              : 'Vehicle removed from your collection.',
      );
    } catch (e) {
      setActionError((e as Error).message);
      setRefresh((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#collection">
        Skip to collection
      </a>
      <aside className="sidebar">
        <Brand />
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav>
          <button className={!lowStock ? 'nav-item active' : 'nav-item'} onClick={reset}>
            <LayoutGrid size={19} /> Inventory <span>{all.length}</span>
          </button>
          <button
            className={lowStock ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              reset();
              setLowStock(true);
            }}
          >
            <Gauge size={19} /> Low stock <span>{all.filter((v) => v.quantity <= 2).length}</span>
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="note-icon">
            <Sparkles size={21} />
          </div>
          <h3>
            A little guidance.
            <br />A lot of possibility.
          </h3>
          <p>
            Get to know your
            <br />
            Forecourt workspace.
          </p>
          <button onClick={() => open({ type: 'help' })}>
            Showroom guide <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <span className="live-dot" /> CONNECTED TO YOUR COLLECTION
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>Inventory</strong>
          </div>
          <div className="profile">
            <span className="role-label">
              <ShieldCheck size={14} />
              {admin ? 'Administrator' : 'Customer'}
            </span>
            <span className="profile-divider" />
            <span className="avatar">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <span className="profile-name">{user.name}</span>
            <button onClick={logout} className="icon-button" aria-label="Sign out" title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="dashboard">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> THE FORECOURT COLLECTION
              </div>
              <h1>
                Your next chapter
                <br />
                starts here.
              </h1>
              <p>Exceptional vehicles. Possibilities worth exploring.</p>
              <span className="hero-caption">
                <span className="live-dot" /> READY FOR WHAT’S NEXT
              </span>
            </div>
            <div className="hero-visual">
              <div className="hero-orbit" />
              <span className="hero-watermark">DRIVE.</span>
              <CarArt hero color="#b6c2aa" />
              <div className="hero-tag">
                <span>THE ART OF MOVING FORWARD</span>
                <ArrowUpRight size={18} />
              </div>
            </div>
          </section>
          <section className="stats" aria-label="Inventory overview">
            <div>
              <span className="stat-label">
                Vehicles in collection
                <CarFront size={16} />
              </span>
              <strong>{all.length.toString().padStart(2, '0')}</strong>
              <span className="stat-note">Distinct models, endless possibility</span>
            </div>
            <div>
              <span className="stat-label">
                Available to drive
                <Box size={16} />
              </span>
              <strong>
                {all
                  .reduce((sum, v) => sum + v.quantity, 0)
                  .toString()
                  .padStart(2, '0')}
                <small> units</small>
              </strong>
              <span className="stat-note">
                <span className="live-dot" /> In stock and ready to go
              </span>
            </div>
            <div>
              <span className="stat-label">
                Collection value
                <ArrowUpRight size={16} />
              </span>
              <strong>{money(all.reduce((sum, v) => sum + v.quantity * v.price, 0))}</strong>
              <span className="stat-note">Total value of available inventory</span>
            </div>
          </section>
          <section id="collection" className="collection">
            <div className="section-heading">
              <div>
                <div className="heading-inline">
                  <h2>{lowStock ? 'Needs a little attention' : 'Explore the collection'}</h2>
                  <span className="count-badge">{shown.length}</span>
                </div>
                <p>
                  {lowStock
                    ? 'Vehicles with two or fewer units in stock.'
                    : 'Find the right fit for your next adventure.'}
                </p>
              </div>
              {admin && (
                <button className="primary" onClick={() => open({ type: 'edit' })}>
                  <Plus size={17} />
                  Add vehicle
                </button>
              )}
            </div>
            <div className="toolbar">
              <div className="search-field">
                <Search size={18} />
                <input
                  aria-label="Search vehicles"
                  type="search"
                  placeholder="Search by make, model, or category…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="icon-button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                className={'secondary filter-button ' + (filtersOpen ? 'selected' : '')}
                onClick={() => setFiltersOpen(!filtersOpen)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={16} />
                Filters{(min || max || stock) && <span className="filter-dot" />}
              </button>
              <div className="sort-field">
                <ArrowDownUp size={15} />
                <select
                  aria-label="Sort vehicles"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="name">Make: A to Z</option>
                </select>
              </div>
            </div>
            {filtersOpen && (
              <div className="filter-panel">
                <label>
                  Minimum price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="$0"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                  />
                </label>
                <label>
                  Maximum price
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="No limit"
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={stock}
                    onChange={(e) => setStock(e.target.checked)}
                  />
                  In stock only
                </label>
                <button className="text-button" onClick={reset}>
                  Clear filters
                </button>
              </div>
            )}
            <div className="category-row">
              {[
                'All vehicles',
                'Sedan',
                'SUV',
                'Coupe',
                'Hatchback',
                'Truck',
                'Convertible',
                'Wagon',
              ].map((c) => (
                <button
                  key={c}
                  className={category === c ? 'category active' : 'category'}
                  onClick={() => setCategory(c)}
                >
                  {c === 'All vehicles' && <LayoutGrid size={13} />} {c}
                </button>
              ))}
            </div>
            {loadError ? (
              <div className="empty-state" role="alert">
                <CircleHelp size={30} />
                <h3>We couldn’t load the collection</h3>
                <p>{loadError}</p>
                <button className="secondary" onClick={() => setRefresh((n) => n + 1)}>
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="vehicle-grid" aria-label="Loading vehicles" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div className="skeleton" key={i} />
                ))}
              </div>
            ) : shown.length === 0 ? (
              <div className="empty-state">
                <CarFront size={34} />
                <h3>No vehicles found</h3>
                <p>Try another search, or make room for something new.</p>
                <button className="secondary" onClick={reset}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="vehicle-grid">
                {shown.map((v) => (
                  <VehicleCard key={v.id} v={v} admin={admin} open={open} />
                ))}
              </div>
            )}
            <div className="collection-footer">
              <span>
                {loading
                  ? 'Finding your next possibility…'
                  : `Showing ${shown.length} ${shown.length === 1 ? 'vehicle' : 'vehicles'}`}
              </span>
              <span>
                <ShieldCheck size={14} /> Every journey begins with confidence.
              </span>
            </div>
          </section>
          <footer className="page-footer">
            <span>
              FORECOURT <span className="brand-dot">/</span> MADE FOR THE JOURNEY.
            </span>
            <span>All prices in USD · Illustrations are representative</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {action && (
        <Modal
          title={
            action.type === 'help'
              ? 'Welcome to your Forecourt'
              : action.type === 'edit'
                ? action.vehicle
                  ? 'Edit vehicle'
                  : 'Add a new vehicle'
                : action.type === 'purchase'
                  ? 'Your next chapter awaits.'
                  : action.type === 'restock'
                    ? 'Make room for more.'
                    : 'Remove this vehicle?'
          }
          close={() => setAction(null)}
          busy={busy}
        >
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
          {action.type === 'edit' ? (
            <VehicleForm vehicle={action.vehicle} save={mutate} busy={busy} />
          ) : action.type === 'help' ? (
            <div className="guide">
              <p>
                Explore the collection by make, model, category, or price. Every stock count comes
                directly from the dealership database.
              </p>
              <p>
                <strong>Find your fit.</strong> Use category tabs and filters to narrow your search.
                A purchase reserves no payment; it immediately removes one unit from inventory.
              </p>
              {admin && (
                <p>
                  <strong>Keep it current.</strong> Add new vehicles, edit details, and restock from
                  each card. Low stock shows vehicles with two or fewer units.
                </p>
              )}
              <p>
                <strong>Your account.</strong> Your sign-in lasts up to eight hours in this browser
                tab. Sign out when you’re finished.
              </p>
              <button className="primary full" onClick={() => setAction(null)}>
                Let’s explore
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <>
              <div className="confirmation-car">
                <CarArt color={action.vehicle.color} category={action.vehicle.category} />
              </div>
              <h3 className="confirmation-name">
                {action.vehicle.make} {action.vehicle.model}
              </h3>
              {action.type === 'purchase' ? (
                <>
                  <p className="muted modal-description">
                    Purchase one vehicle for <strong>{money(action.vehicle.price)}</strong>. This
                    updates dealership stock; no payment is processed.
                  </p>
                  <button className="primary full" disabled={busy} onClick={() => mutate()}>
                    {busy ? 'Purchasing…' : 'Confirm purchase'}
                    <ArrowRight size={17} />
                  </button>
                </>
              ) : action.type === 'restock' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutate({ quantity: Number(new FormData(e.currentTarget).get('quantity')) });
                  }}
                >
                  <p className="muted modal-description">
                    Currently {action.vehicle.quantity} in stock.
                  </p>
                  <label>
                    Units to add
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      max={1000000}
                      defaultValue={1}
                      required
                    />
                  </label>
                  <button className="primary full" disabled={busy} type="submit">
                    {busy ? 'Updating…' : 'Confirm restock'}
                    <PackagePlus size={17} />
                  </button>
                </form>
              ) : (
                <>
                  <p className="muted modal-description">
                    This removes the vehicle and its stock from the collection. This action cannot
                    be undone.
                  </p>
                  <button className="danger full" disabled={busy} onClick={() => mutate()}>
                    {busy ? 'Removing…' : 'Confirm delete'}
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const logout = () => {
    sessionStorage.removeItem('forecourt-token');
    setUser(null);
  };
  useEffect(() => {
    const expire = () => logout();
    window.addEventListener('session-expired', expire);
    if (sessionStorage.getItem('forecourt-token'))
      api<{ user: User }>('/auth/me')
        .then((r) => setUser(r.user))
        .catch(logout)
        .finally(() => setChecking(false));
    else setChecking(false);
    return () => window.removeEventListener('session-expired', expire);
  }, []);
  if (checking)
    return (
      <div className="app-loading">
        <Brand />
        <p>Opening the showroom…</p>
      </div>
    );
  return user ? <Dashboard user={user} logout={logout} /> : <Auth onLogin={setUser} />;
}
