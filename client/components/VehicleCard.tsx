import { ArrowUpRight, Gauge, PackagePlus, Pencil, Trash2, Zap } from 'lucide-react';
import { money, type Vehicle } from '../api';
import type { Action } from '../actions';
import { CarArt } from '../CarArt';
export function VehicleCard({
  v,
  admin,
  open,
}: {
  v: Vehicle;
  admin: boolean;
  open: (action: Action) => void;
}) {
  return (
    <article className="vehicle-card">
      <div className="vehicle-art">
        <span className="category-label">{v.category}</span>
        <span
          className={'stock-badge ' + (!v.quantity ? 'sold-out' : v.quantity <= 2 ? 'low' : '')}
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
            <button onClick={() => open({ type: 'edit', vehicle: v })} aria-label="Edit vehicle">
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
  );
}
