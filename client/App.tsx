import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { api, categories, money, type User, type Vehicle } from './api';
import { CarArt } from './CarArt';

const Brand = () => (
  <div className="brand">
    <span className="brand-mark">
      f<span>.</span>
    </span>
    <span>
      forecourt<span className="brand-dot">.</span>
    </span>
  </div>
);
function Modal({
  title,
  children,
  close,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-content">
        <div className="modal-heading flex items-center justify-between gap-3">
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Auth({ onLogin }: { onLogin: (user: User) => void }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ user: User; token: string }>(
        register ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
            ...(register ? { name: form.get('name') } : {}),
          }),
        },
      );
      sessionStorage.setItem('forecourt-token', result.token);
      onLogin(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <div className="eyebrow light">
            <span /> A BETTER WAY TO DRIVE
          </div>
          <h1>
            Good cars.
            <br />
            Great beginnings.
          </h1>
          <p>
            A considered collection. A clearer view.
            <br />
            Your next chapter starts at Forecourt.
          </p>
        </div>
        <div className="auth-art">
          <div className="art-sun" />
          <CarArt hero color="#ced6b8" />
          <span className="auth-art-caption">THE ROAD AHEAD IS YOURS.</span>
        </div>
        <div className="auth-foot">
          <ShieldCheck size={17} /> Thoughtfully selected. Ready for the road.
        </div>
      </section>
      <section className="auth-form-section">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="overline">WELCOME TO FORECOURT</span>
          <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'Create your account and find what moves you.'
              : 'Sign in to explore your next possibility.'}
          </p>
          <form onSubmit={submit} className="auth-form flex flex-col">
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                placeholder={register ? 'At least 10 characters' : 'Enter your password'}
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button disabled={busy} className="primary full" type="submit">
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Forecourt?'}{' '}
            <button
              onClick={() => {
                setRegister(!register);
                setError('');
              }}
            >
              {register ? 'Sign in instead' : 'Create account'}
            </button>
          </p>
          <div className="auth-note">
            <ShieldCheck size={18} />
            <p>
              Your next drive, in good hands.
              <br />
              <span>Secure access to our vehicle collection.</span>
            </p>
          </div>
        </div>
        <span className="auth-bottom">
          FORECOURT © {new Date().getFullYear()} <span>MADE FOR THE JOURNEY</span>
        </span>
      </section>
    </main>
  );
}

type Action =
  | { type: 'purchase' | 'delete' | 'restock'; vehicle: Vehicle }
  | { type: 'edit'; vehicle?: Vehicle }
  | { type: 'help' };
function VehicleForm({
  vehicle,
  save,
  busy,
}: {
  vehicle?: Vehicle;
  save: (body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save({
      make: f.get('make'),
      model: f.get('model'),
      category: f.get('category'),
      price: Number(f.get('price')),
      quantity: Number(f.get('quantity')),
      year: Number(f.get('year')),
      fuel: f.get('fuel'),
      color: f.get('color'),
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      <p className="muted modal-description">
        {vehicle
          ? 'Keep your collection accurate and up to date.'
          : 'A new addition to your collection. Fill in the details below.'}
      </p>
      <div className="form-grid grid grid-cols-2">
        <label>
          Make
          <input
            name="make"
            defaultValue={vehicle?.make}
            required
            maxLength={60}
            placeholder="Porsche"
          />
        </label>
        <label>
          Model
          <input
            name="model"
            defaultValue={vehicle?.model}
            required
            maxLength={80}
            placeholder="911 Carrera"
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={vehicle?.category ?? 'Sedan'}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Year
          <input
            name="year"
            type="number"
            min={1886}
            max={2100}
            defaultValue={vehicle?.year ?? new Date().getFullYear()}
            required
          />
        </label>
        <label>
          Price (USD)
          <input
            name="price"
            type="number"
            min={0}
            max={100000000}
            step="0.01"
            defaultValue={vehicle?.price}
            placeholder="54000"
            required
          />
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min={0}
            max={1000000}
            defaultValue={vehicle?.quantity ?? 1}
            required
          />
        </label>
        <label>
          Fuel type
          <select name="fuel" defaultValue={vehicle?.fuel ?? 'Petrol'}>
            {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label>
          Vehicle color
          <input name="color" type="color" defaultValue={vehicle?.color ?? '#aebda8'} />
        </label>
      </div>
      <button type="submit" className="primary full" disabled={busy}>
        {busy ? 'Saving…' : 'Save vehicle'}
        <Check size={17} />
      </button>
    </form>
  );
}
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
                  <article className="vehicle-card" key={v.id}>
                    <div className="vehicle-art">
                      <span className="category-label">{v.category}</span>
                      <span
                        className={
                          'stock-badge ' + (!v.quantity ? 'sold-out' : v.quantity <= 2 ? 'low' : '')
                        }
                      >
                        <i />
                        {v.quantity ? `${v.quantity} in stock` : 'Out of stock'}
                      </span>
                      <CarArt color={v.color} category={v.category} />
                      <span className="image-label">FORECOURT SELECT</span>
                    </div>
                    <div className="card-body">
                      <div className="vehicle-make">{v.make}</div>
                      <h3>{v.model}</h3>
                      <div className="vehicle-specs">
                        <span>{v.year}</span>
                        <i />
                        {v.fuel === 'Electric' ? <Zap size={12} /> : <Gauge size={12} />}
                        <span>{v.fuel}</span>
                        <i />
                        <span>{v.category}</span>
                      </div>
                      <div className="card-bottom">
                        <div className="price">
                          <span>YOUR NEXT CHAPTER FROM</span>
                          <strong>{money(v.price)}</strong>
                        </div>
                        <button
                          className="purchase-button"
                          aria-label={v.quantity ? 'Purchase vehicle' : 'Out of stock'}
                          disabled={!v.quantity}
                          onClick={() => open({ type: 'purchase', vehicle: v })}
                        >
                          {v.quantity ? (
                            <>
                              Purchase
                              <ArrowUpRight size={15} />
                            </>
                          ) : (
                            'Out of stock'
                          )}
                        </button>
                      </div>
                      {admin && (
                        <div className="admin-actions">
                          <button
                            onClick={() => open({ type: 'edit', vehicle: v })}
                            aria-label="Edit vehicle"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => open({ type: 'restock', vehicle: v })}
                            aria-label="Restock vehicle"
                          >
                            <PackagePlus size={14} />
                            Restock
                          </button>
                          <button
                            className="delete-action"
                            onClick={() => open({ type: 'delete', vehicle: v })}
                            aria-label="Delete vehicle"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
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
