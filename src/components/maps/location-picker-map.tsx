'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Compass,
  Crosshair,
  GraduationCap,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number | '';
  longitude: number | '';
  radiusMeter: number;
  onLocationChange: (lat: number, lng: number) => void;
  onRadiusChange: (radius: number) => void;
  schoolNameHint?: string;
  className?: string;
}

interface SearchResult {
  id: string;
  name: string;
  fullAddress: string;
  lat: number;
  lng: number;
  category?: 'school' | 'address' | 'place';
}

// Default center: Monas Jakarta (-6.1754, 106.8272)
const DEFAULT_LAT = -6.1754;
const DEFAULT_LNG = 106.8272;

export function LocationPickerMap({
  latitude,
  longitude,
  radiusMeter,
  onLocationChange,
  onRadiusChange,
  schoolNameHint,
  className = '',
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(radiusMeter);

  const curLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : DEFAULT_LAT;
  const curLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : DEFAULT_LNG;

  // 1. Load Leaflet CSS & JS dynamically (Zero SSR conflicts)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet CSS already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Check if Leaflet JS already loaded
    if ((window as any).L) {
      setIsLeafletReady(true);
      return;
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => {
        setIsLeafletReady(true);
      };
      document.body.appendChild(script);
    } else {
      const existingScript = document.getElementById('leaflet-js') as HTMLScriptElement;
      existingScript.addEventListener('load', () => setIsLeafletReady(true));
    }
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Custom pulse pin HTML marker
    const customPinIcon = L.divIcon({
      className: 'custom-school-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [curLat, curLng],
      zoom: 16,
      zoomControl: false,
    });

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add Geofence Circle
    const circle = L.circle([curLat, curLng], {
      color: '#2563eb',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.18,
      radius: radiusMeter || 100,
      dashArray: '4, 6',
    }).addTo(map);

    // Add Draggable Marker
    const marker = L.marker([curLat, curLng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 2px;">
        <strong style="color: #0f172a; display: block; font-size: 13px; margin-bottom: 2px;">Titik Pusat Sekolah</strong>
        <span style="color: #64748b;">Radius Geofence: <b>${radiusMeter || 100} m</b></span>
      </div>
    `);

    // Event: Marker Drag End
    marker.on('dragend', (e: any) => {
      const newPos = e.target.getLatLng();
      circle.setLatLng(newPos);
      onLocationChange(Number(newPos.lat.toFixed(6)), Number(newPos.lng.toFixed(6)));
    });

    // Event: Map Click to relocate
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      onLocationChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]);

  // 3. Update Marker & Circle when latitude / longitude props change
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;
    if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
      const curPos = markerRef.current.getLatLng();
      if (curPos.lat !== latitude || curPos.lng !== longitude) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // 4. Update Circle radius when radiusMeter prop changes
  useEffect(() => {
    if (circleRef.current && radiusMeter > 0) {
      circleRef.current.setRadius(radiusMeter);
      if (markerRef.current) {
        markerRef.current.setPopupContent(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: #0f172a; display: block; font-size: 13px; margin-bottom: 2px;">Titik Pusat Sekolah</strong>
            <span style="color: #64748b;">Radius Geofence: <b>${radiusMeter} m</b></span>
          </div>
        `);
      }
    }
  }, [radiusMeter]);

  // 5. Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResultsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 6. Recenter map to current point
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([curLat, curLng], 17, { duration: 1 });
  };

  // 7. Locate user via Browser GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung deteksi lokasi GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onLocationChange(lat, lng);
        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          circleRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`Gagal mendeteksi lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // 8. Helper to expand Indonesian school abbreviations for high search accuracy
  const getQueryVariants = (query: string): string[] => {
    const q = query.trim();
    const variants = [q];

    if (/^sman\b/i.test(q)) {
      variants.push(q.replace(/^sman\b/i, 'SMA Negeri'));
    } else if (/^sma negeri\b/i.test(q)) {
      variants.push(q.replace(/^sma negeri\b/i, 'SMAN'));
    }

    if (/^smpn\b/i.test(q)) {
      variants.push(q.replace(/^smpn\b/i, 'SMP Negeri'));
    } else if (/^smp negeri\b/i.test(q)) {
      variants.push(q.replace(/^smp negeri\b/i, 'SMPN'));
    }

    if (/^sdn\b/i.test(q)) {
      variants.push(q.replace(/^sdn\b/i, 'SD Negeri'));
    } else if (/^sd negeri\b/i.test(q)) {
      variants.push(q.replace(/^sd negeri\b/i, 'SDN'));
    }

    if (/^smkn\b/i.test(q)) {
      variants.push(q.replace(/^smkn\b/i, 'SMK Negeri'));
    } else if (/^smk negeri\b/i.test(q)) {
      variants.push(q.replace(/^smk negeri\b/i, 'SMKN'));
    }

    if (/^man\b/i.test(q)) {
      variants.push(q.replace(/^man\b/i, 'Madrasah Aliyah Negeri'));
    }

    if (/^mtsn\b/i.test(q)) {
      variants.push(q.replace(/^mtsn\b/i, 'MTs Negeri'));
    }

    return variants;
  };

  // 9. Multi-source Search (Photon OSM + Nominatim OpenStreetMap)
  const executeSearch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setShowResultsDropdown(true);

    try {
      const variants = getQueryVariants(trimmed);
      const searchPromises: Promise<SearchResult[]>[] = [];

      // A. Photon OSM Geocoder (Very fast POI & School search)
      for (const v of variants.slice(0, 2)) {
        searchPromises.push(
          fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&limit=8&lang=id`)
            .then((res) => res.json())
            .then((data) => {
              if (!data?.features) return [];
              return data.features.map((f: any, idx: number): SearchResult => {
                const props = f.properties || {};
                const name =
                  props.name ||
                  [props.street, props.housenumber].filter(Boolean).join(' ') ||
                  'Lokasi Terpilih';
                const parts = [
                  props.street,
                  props.district || props.suburb,
                  props.city || props.county,
                  props.state,
                  props.country,
                ].filter(Boolean);
                const fullAddress = parts.join(', ') || props.formatted || name;
                const isSchool =
                  props.osm_value === 'school' ||
                  props.osm_value === 'college' ||
                  props.osm_value === 'university' ||
                  props.osm_value === 'kindergarten' ||
                  /\b(sma|smp|sd|smk|sekolah|madrasah|pesantren|institut|universitas|kampus|yayasan|mts|ma)\b/i.test(
                    name,
                  );

                return {
                  id: `photon-${props.osm_id || idx}-${props.osm_type || 'p'}`,
                  name,
                  fullAddress,
                  lat: Number(f.geometry.coordinates[1].toFixed(6)),
                  lng: Number(f.geometry.coordinates[0].toFixed(6)),
                  category: isSchool ? 'school' : 'place',
                };
              });
            })
            .catch(() => []),
        );
      }

      // B. OpenStreetMap Nominatim
      searchPromises.push(
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            trimmed,
          )}&countrycodes=id&limit=8&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'id,en',
            },
          },
        )
          .then((res) => res.json())
          .then((data) => {
            if (!Array.isArray(data)) return [];
            return data.map((item: any): SearchResult => {
              const name = item.name || item.display_name.split(',')[0] || 'Lokasi Terpilih';
              const isSchool =
                item.type === 'school' ||
                item.class === 'amenity' ||
                item.type === 'university' ||
                item.type === 'college' ||
                /\b(sma|smp|sd|smk|sekolah|madrasah|pesantren|institut|universitas|kampus|yayasan|mts|ma)\b/i.test(
                  item.display_name,
                );

              return {
                id: `nominatim-${item.place_id}`,
                name,
                fullAddress: item.display_name,
                lat: Number(parseFloat(item.lat).toFixed(6)),
                lng: Number(parseFloat(item.lon).toFixed(6)),
                category: isSchool ? 'school' : 'place',
              };
            });
          })
          .catch(() => []),
      );

      const allResultsNested = await Promise.all(searchPromises);
      const combined = allResultsNested.flat();

      // Deduplicate by close lat/lng (within ~20 meters)
      const unique: SearchResult[] = [];
      for (const item of combined) {
        const isDuplicate = unique.some(
          (u) => Math.abs(u.lat - item.lat) < 0.0002 && Math.abs(u.lng - item.lng) < 0.0002,
        );
        if (!isDuplicate) {
          unique.push(item);
        }
      }

      // Prioritize schools in sorting
      unique.sort((a, b) => {
        if (a.category === 'school' && b.category !== 'school') return -1;
        if (a.category !== 'school' && b.category === 'school') return 1;
        return 0;
      });

      setSearchResults(unique.slice(0, 10));
    } catch (err) {
      console.error('Pencarian sekolah gagal:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 10. Live Debounced Search as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    const timer = setTimeout(() => {
      executeSearch(searchQuery);
    }, 380);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    }
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = result.lat;
    const lng = result.lng;
    onLocationChange(lat, lng);
    setShowResultsDropdown(false);
    setSearchQuery(result.name);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      markerRef.current.setPopupContent(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <strong style="color: #0f172a; display: block; font-size: 13px; margin-bottom: 2px;">${result.name}</strong>
          <p style="color: #64748b; font-size: 11px; margin: 0 0 4px 0;">${result.fullAddress}</p>
          <span style="color: #2563eb; font-weight: 600;">Radius Geofence: ${radiusMeter || 100} m</span>
        </div>
      `);
      markerRef.current.openPopup();
      mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  };

  const handleQuickSchoolSearch = (nameToSearch: string) => {
    setSearchQuery(nameToSearch);
    executeSearch(nameToSearch);
  };

  // Preset radius options
  const presetRadii = [50, 100, 200, 300, 500, 1000];

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Search Bar & Fast GPS Tool */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative" ref={searchContainerRef}>
        <form onSubmit={handleManualSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <Input
            type="text"
            placeholder="Cari nama sekolah (contoh: SMAN 1 Jakarta, SMPN 2 Bandung)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0 || (searchQuery.trim().length >= 2 && hasSearched)) {
                setShowResultsDropdown(true);
              }
            }}
            className="pl-9 pr-24 text-xs h-9"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResultsDropdown(false);
              }}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground transition-colors"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={isSearching}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2.5 text-xs text-primary hover:bg-primary-light font-medium"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
          </Button>

          {/* Search Dropdown Results */}
          {showResultsDropdown && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-surface border border-border rounded-xl shadow-xl overflow-hidden divide-y divide-border/60 animate-in fade-in zoom-in-95 max-h-72 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Mencari data sekolah &amp; lokasi di OpenStreetMap...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full px-3.5 py-2.5 text-left text-xs hover:bg-surface-elevated transition-colors flex items-start gap-2.5 text-foreground group"
                  >
                    <div className="mt-0.5 p-1 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                      {res.category === 'school' ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{res.name}</p>
                        {res.category === 'school' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-primary-light text-primary shrink-0 border border-primary/20">
                            Sekolah
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground-muted truncate mt-0.5">{res.fullAddress}</p>
                    </div>
                  </button>
                ))
              ) : hasSearched && searchQuery.trim().length >= 2 ? (
                <div className="p-4 text-center text-xs text-foreground-muted">
                  <p className="font-medium text-foreground">Sekolah atau lokasi tidak ditemukan</p>
                  <p className="text-[11px] mt-1">
                    Coba ketikkan nama lengkap sekolah beserta kota (misal: "SMA Negeri 1 Jakarta") atau geser pin langsung pada peta.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="h-9 gap-1.5 text-xs border-border bg-surface hover:border-primary text-foreground shrink-0"
            title="Deteksi Lokasi GPS Saya"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <LocateFixed className="w-3.5 h-3.5 text-primary" />
            )}
            <span>Lokasi Saya</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecenter}
            className="h-9 w-9 p-0 border-border bg-surface hover:border-primary text-foreground shrink-0"
            title="Pusatkan Peta ke Titik Sekolah"
          >
            <Crosshair className="w-4 h-4 text-primary" />
          </Button>
        </div>
      </div>

      {/* Quick Search Button from School Name Hint */}
      {schoolNameHint && schoolNameHint.trim().length > 0 && searchQuery !== schoolNameHint && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] text-foreground-muted">Pencarian Cepat Nama Sekolah:</span>
          <button
            type="button"
            onClick={() => handleQuickSchoolSearch(schoolNameHint)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-primary/30 text-primary hover:bg-primary-light hover:border-primary text-[11px] font-medium transition-colors"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Cari "{schoolNameHint}"</span>
          </button>
        </div>
      )}

      {/* Map Canvas Container */}
      <div className="relative rounded-xl border border-border overflow-hidden shadow-subtle bg-surface-muted min-h-[360px]">
        {!isLeafletReady && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-xs text-foreground-muted">
            <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
            <p className="text-xs font-medium">Memuat Peta Leaflet &amp; OpenStreetMap...</p>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="w-full h-[360px] z-10"
          style={{ width: '100%', height: '360px' }}
        />

        {/* Floating Instruction Banner */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface/90 backdrop-blur-md border border-border shadow-sm text-[11px] text-foreground font-medium">
            <Compass className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: '8s' }} />
            <span>Klik peta atau geser pin untuk mengubah koordinat</span>
          </div>
        </div>

        {/* Floating Coordinate summary pill */}
        <div className="absolute bottom-2 left-2 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/95 backdrop-blur-md border border-border shadow-md text-xs font-mono text-foreground">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-foreground-muted">LAT:</span>
              <span className="font-bold text-primary">{curLat.toFixed(6)}</span>
            </div>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-foreground-muted">LNG:</span>
              <span className="font-bold text-primary">{curLng.toFixed(6)}</span>
            </div>
          </div>
        </div>

        {/* Floating Radius summary badge */}
        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white shadow-md text-xs font-semibold">
            <span>Radius:</span>
            <span className="font-extrabold">{radiusMeter || 100} m</span>
          </div>
        </div>
      </div>

      {/* Radius Controls & Quick Presets */}
      <div className="p-4 rounded-xl border border-border bg-surface-elevated/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Atur Radius Jangkauan Geofence:</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <span>Toleransi jangkauan:</span>
            <span className="font-extrabold text-primary font-mono text-sm">{radiusMeter} meter</span>
            <span className="text-[11px]">({(radiusMeter / 1000).toFixed(2)} km)</span>
          </div>
        </div>

        {/* Slider */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-foreground-muted w-8">10m</span>
          <input
            type="range"
            min={10}
            max={1500}
            step={10}
            value={radiusMeter || 100}
            onChange={(e) => {
              const val = Number(e.target.value);
              onRadiusChange(val);
              setActivePreset(val);
            }}
            className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="text-[11px] font-mono text-foreground-muted w-12 text-right">1500m</span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <span className="text-[11px] font-medium text-foreground-muted">Pilihan Cepat:</span>
          {presetRadii.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                onRadiusChange(r);
                setActivePreset(r);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border ${
                radiusMeter === r
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface border-border text-foreground-muted hover:border-primary/50 hover:text-foreground'
              }`}
            >
              {r} m
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
