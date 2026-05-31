import { useMemo, useState } from "react";
import type { AccommodationListItem, Booking } from "../../api/types";
import {
  filterProperties,
  sortProperties,
  statsForProperty,
  type SortKey,
} from "../../utils/ownerPropertyStats";
import { PrimeIcon } from "../PrimeIcon";
import { OwnerPropertiesToolbar } from "./OwnerPropertiesToolbar";
import { OwnerPropertyCard } from "./OwnerPropertyCard";

type Props = {
  properties: AccommodationListItem[];
  bookings: Booking[];
  onCreateNew: () => void;
};

export function OwnerPropertiesList({ properties, bookings, onCreateNew }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recientes");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () => sortProperties(filterProperties(properties, searchQuery, statusFilter), sortBy),
    [properties, searchQuery, statusFilter, sortBy],
  );

  if (properties.length === 0) {
    return (
      <div className="owner-properties-empty">
        <PrimeIcon name="pi-home" className="owner-properties-empty-icon" size={48} />
        <h2>Aún no tienes hospedajes</h2>
        <p>Crea el primero con &ldquo;Nuevo local&rdquo; y envíalo a revisión del administrador.</p>
        <button type="button" className="owner-action-btn" onClick={onCreateNew}>
          <PrimeIcon name="pi-plus" size={18} />
          Nuevo local
        </button>
      </div>
    );
  }

  return (
    <>
      <OwnerPropertiesToolbar
        count={filtered.length}
        searchQuery={searchQuery}
        sortBy={sortBy}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onStatusFilterChange={setStatusFilter}
      />

      {filtered.length === 0 ? (
        <div className="owner-properties-empty owner-properties-empty--compact">
          <PrimeIcon name="pi-search" className="owner-properties-empty-icon" size={40} />
          <h2>Sin resultados</h2>
          <p>Prueba otro nombre o quita el filtro de estado.</p>
        </div>
      ) : (
        <div className="owner-properties-grid">
          {filtered.map((property) => (
            <OwnerPropertyCard
              key={property.id}
              property={property}
              stats={statsForProperty(property, bookings)}
            />
          ))}
        </div>
      )}
    </>
  );
}
