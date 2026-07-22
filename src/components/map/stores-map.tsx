"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapStore = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  chainName: string;
  chainSlug: string;
  color: string | null;
};

export function StoresMap({ stores }: { stores: MapStore[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView([48.7, 19.5], 8); // Slovakia
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      for (const store of stores) {
        const marker = L.circleMarker([store.lat, store.lng], {
          radius: 9,
          color: store.color ?? "#047857",
          fillColor: store.color ?? "#047857",
          fillOpacity: 0.85,
          weight: 2,
        }).addTo(map);
        marker.bindPopup(
          `<strong>${store.chainName}</strong><br>${store.name}<br>` +
            `<span style="color:#666">${store.address}, ${store.city}</span><br>` +
            `<a href="https://www.openstreetmap.org/directions?to=${store.lat}%2C${store.lng}" target="_blank" rel="noopener">Navigovať →</a>`
        );
      }

      // Zoom to user's position when they allow it
      map.locate({ setView: false });
      map.on("locationfound", (e) => {
        L.circleMarker(e.latlng, {
          radius: 7,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup("Ste tu");
        map.setView(e.latlng, 12);
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [stores]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-border/60"
      role="application"
      aria-label="Mapa predajní"
    />
  );
}
