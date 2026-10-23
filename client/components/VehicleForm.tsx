import { type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { categories, type Vehicle } from '../api';
export function VehicleForm({
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
          <select aria-label="Category" name="category" defaultValue={vehicle?.category ?? 'Sedan'}>
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
          <select aria-label="Fuel type" name="fuel" defaultValue={vehicle?.fuel ?? 'Petrol'}>
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
