import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

const ESTONIA_CENTER = [58.7, 25.5];
const COLORS = { venue_claim: '#2E9E7A', third_party_listing: '#E59B1C', customer_reports: '#C2304F' };

function FlyTo({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place?.lat != null) map.flyTo([place.lat, place.lng], 15, { duration: 0.6 });
  }, [place, map]);
  return null;
}

export default function PlacesMap({ places, selectedId, onSelect }) {
  const mapped = places.filter((p) => p.lat != null && p.lng != null);
  const selected = mapped.find((p) => p.id === selectedId);

  return (
    <>
      <MapContainer center={ESTONIA_CENTER} zoom={7} className="map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapped.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={p.id === selectedId ? 11 : 8}
            pathOptions={{ color: COLORS[p.halalStatus] ?? '#555', fillOpacity: 0.8 }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup><strong>{p.name}</strong><br />{p.address}</Popup>
          </CircleMarker>
        ))}
        <FlyTo place={selected} />
      </MapContainer>
      {places.length > mapped.length && (
        <div className="map-note">{places.length - mapped.length} place(s) have no confirmed address and are not on the map.</div>
      )}
    </>
  );
}
