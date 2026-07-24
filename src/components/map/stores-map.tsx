"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, CircleMarker } from "leaflet";
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

/**
 * Store map with viewport-based loading: only the stores inside the current
 * view are fetched (~2.7k exist nationwide, far too many to render at once).
 */
export function StoresMap({ chainSlug }: { chainSlug?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, CircleMarker>());
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { preferCanvas: true }).setView(
        [48.7, 19.5],
        8 // whole of Slovakia
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> prispievatelia',
        maxZoom: 19,
      }).addTo(map);

      async function loadViewport() {
        const b = map.getBounds();
        const params = new URLSearchParams({
          minLat: String(b.getSouth()),
          maxLat: String(b.getNorth()),
          minLng: String(b.getWest()),
          maxLng: String(b.getEast()),
        });
        if (chainSlug) params.set("chain", chainSlug);

        setLoading(true);
        try {
          const res = await fetch(`/api/v1/stores?${params}`);
          if (!res.ok) return;
          const { stores } = (await res.json()) as { stores: MapStore[] };
          if (cancelled) return;

          const visible = new Set<string>();
          for (const store of stores) {
            visible.add(store.id);
            if (markersRef.current.has(store.id)) continue;

            const marker = L.circleMarker([store.lat, store.lng], {
              radius: 7,
              color: store.color ?? "#047857",
              fillColor: store.color ?? "#047857",
              fillOpacity: 0.85,
              weight: 2,
            }).addTo(map);

            marker.bindPopup(
              `<strong>${escapeHtml(store.chainName)}</strong><br>${escapeHtml(store.name)}<br>` +
                `<span style="color:#666">${escapeHtml(store.address)}, ${escapeHtml(store.city)}</span><br>` +
                `<a href="https://www.openstreetmap.org/directions?to=${store.lat}%2C${store.lng}" target="_blank" rel="noopener">Navigovať →</a>`
            );
            markersRef.current.set(store.id, marker);
          }

          // Drop markers that scrolled out of view to keep the canvas light
          for (const [id, marker] of markersRef.current) {
            if (!visible.has(id) && markersRef.current.size > 600) {
              marker.remove();
              markersRef.current.delete(id);
            }
          }
          setCount(markersRef.current.size);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      // Debounce pans/zooms so dragging doesn't spam the API
      let timer: ReturnType<typeof setTimeout>;
      const onMove = () => {
        clearTimeout(timer);
        timer = setTimeout(loadViewport, 350);
      };
      map.on("moveend zoomend", onMove);

      await loadViewport();

      map.locate({ setView: false });
      map.on("locationfound", (e) => {
        L.circleMarker(e.latlng, {
          radius: 8,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 0.9,
          weight: 3,
        })
          .addTo(map)
          .bindPopup("Ste tu");
        map.setView(e.latlng, 13);
      });

      cleanup = () => {
        clearTimeout(timer);
        map.off("moveend zoomend", onMove);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [chainSlug]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[460px] w-full overflow-hidden rounded-2xl border border-border/60"
        role="application"
        aria-label="Mapa predajní"
      />
      <div className="pointer-events-none absolute top-3 right-3 z-[400] rounded-lg bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
        {loading ? "Načítava sa…" : `${count} predajní v zobrazení`}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
