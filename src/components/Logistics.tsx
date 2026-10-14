import React, { useState, useMemo } from 'react';
import { Search, MapPin, TrendingUp, Clock, AlertTriangle, Radio, Navigation, Zap, Eye, ChevronRight, Truck, Users, Wifi } from 'lucide-react';
import { formatAppDate } from '../utils/formatters';

interface LiveVehicle {
  id: string;
  vrn: string;
  driver: string;
  fleet_group: string;
  status: 'Moving' | 'Idling' | 'Offline' | 'Alert';
  speed: number;
  location: string;
  lastPing: string;
  alert_type: string | null;
  lat: number;
  lng: number;
}

const mockVehicles: LiveVehicle[] = [
  {
    id: 'VEH-001',
    vrn: 'ABC123',
    driver: 'Sarah Mitchell',
    fleet_group: 'Fleetcar',
    status: 'Alert',
    speed: 115,
    location: 'M1 Motorway, Sydney',
    lastPing: new Date(Date.now() - 45000).toISOString(),
    alert_type: 'Critical Speeding: 115km/h in 100 zone',
    lat: -33.8688,
    lng: 151.2093
  },
  {
    id: 'VEH-002',
    vrn: 'XYZ789',
    driver: 'James Cooper',
    fleet_group: 'Yonder',
    status: 'Moving',
    speed: 78,
    location: 'Pacific Highway, Brisbane',
    lastPing: new Date(Date.now() - 12000).toISOString(),
    alert_type: null,
    lat: -27.4698,
    lng: 153.0251
  },
  {
    id: 'VEH-003',
    vrn: 'DEF456',
    driver: 'Emma Rodriguez',
    fleet_group: 'Gigcar',
    status: 'Idling',
    speed: 0,
    location: 'Melbourne CBD',
    lastPing: new Date(Date.now() - 180000).toISOString(),
    alert_type: null,
    lat: -37.8136,
    lng: 144.9631
  },
  {
    id: 'VEH-004',
    vrn: 'GHI012',
    driver: 'Michael Chen',
    fleet_group: 'Fleetcar',
    status: 'Alert',
    speed: 0,
    location: 'Eastern Distributor, Sydney',
    lastPing: new Date(Date.now() - 420000).toISOString(),
    alert_type: 'Geotab Power Loss',
    lat: -33.8735,
    lng: 151.2152
  },
  {
    id: 'VEH-005',
    vrn: 'JKL345',
    driver: 'Lisa Anderson',
    fleet_group: 'Yonder',
    status: 'Moving',
    speed: 62,
    location: 'Great Western Highway, Penrith',
    lastPing: new Date(Date.now() - 8000).toISOString(),
    alert_type: null,
    lat: -33.7507,
    lng: 150.6939
  },
  {
    id: 'VEH-006',
    vrn: 'MNO678',
    driver: 'David Park',
    fleet_group: 'Gigcar',
    status: 'Offline',
    speed: 0,
    location: 'Unknown',
    lastPing: new Date(Date.now() - 3600000).toISOString(),
    alert_type: null,
    lat: -33.8688,
    lng: 151.2093
  },
  {
    id: 'VEH-007',
    vrn: 'PQR901',
    driver: 'Rachel Kim',
    fleet_group: 'Fleetcar',
    status: 'Moving',
    speed: 95,
    location: 'Hume Highway, Sydney',
    lastPing: new Date(Date.now() - 5000).toISOString(),
    alert_type: null,
    lat: -33.9177,
    lng: 151.1718
  },
  {
    id: 'VEH-008',
    vrn: 'STU234',
    driver: 'Tom Wilson',
    fleet_group: 'Yonder',
    status: 'Idling',
    speed: 0,
    location: 'Gold Coast Highway, QLD',
    lastPing: new Date(Date.now() - 240000).toISOString(),
    alert_type: null,
    lat: -28.0167,
    lng: 153.4000
  }
];

export function Logistics() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'all'>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<LiveVehicle | null>(null);

  const filteredVehicles = useMemo(() => {
    let filtered = [...mockVehicles];

    if (activeTab === 'alerts') {
      filtered = filtered.filter(v => v.status === 'Alert');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        v =>
          v.vrn.toLowerCase().includes(query) ||
          v.driver.toLowerCase().includes(query) ||
          v.location.toLowerCase().includes(query) ||
          v.fleet_group.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeTab, searchQuery]);

  const alertCount = mockVehicles.filter(v => v.status === 'Alert').length;

  function getStatusColor(status: LiveVehicle['status']) {
    switch (status) {
      case 'Moving':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'Idling':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Offline':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400';
      case 'Alert':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
  }

  function getStatusIcon(status: LiveVehicle['status']) {
    switch (status) {
      case 'Moving':
        return <Navigation size={14} className="text-green-600 dark:text-green-400" />;
      case 'Idling':
        return <Radio size={14} className="text-yellow-600 dark:text-yellow-400" />;
      case 'Offline':
        return <Zap size={14} className="text-slate-500 dark:text-slate-400" />;
      case 'Alert':
        return <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />;
    }
  }

  function getStatusDot(status: LiveVehicle['status']) {
    switch (status) {
      case 'Moving':
        return (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        );
      case 'Alert':
        return (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        );
      case 'Idling':
        return <span className="w-3 h-3 rounded-full bg-yellow-500"></span>;
      case 'Offline':
        return <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600"></span>;
    }
  }

  function getTimeSinceLastPing(lastPing: string): string {
    const now = new Date();
    const ping = new Date(lastPing);
    const diffMs = now.getTime() - ping.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  }

  return (
    <div className="h-full flex overflow-hidden relative bg-slate-50 dark:bg-slate-950">
      {/* Left Column - Watchlist */}
      <div className="w-[400px] flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-20 shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-1">
            <Truck size={24} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Logistics & Dispatch</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Wifi size={14} className="text-green-500" />
            Live Geotab & Fleetio Telemetry
          </p>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'alerts'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Watchlist (Alerts)
              {alertCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {alertCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Fleet
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search VRN, driver, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Vehicle List */}
        <div className="flex-1 overflow-y-auto">
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center">
              <Truck size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {searchQuery ? 'No vehicles match your search' : 'No alerts at this time'}
              </p>
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle)}
                className={`p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group relative ${
                  vehicle.status === 'Alert' ? 'border-l-4 border-l-red-500' : ''
                } ${
                  selectedVehicle?.id === vehicle.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusDot(vehicle.status)}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{vehicle.vrn}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                        {getStatusIcon(vehicle.status)}
                        {vehicle.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 ml-5">
                      <Users size={12} />
                      <span>{vehicle.driver}</span>
                      <span className="text-slate-400 dark:text-slate-500">•</span>
                      <span className="text-slate-500 dark:text-slate-500">{vehicle.fleet_group}</span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors flex-shrink-0 ml-2"
                  />
                </div>

                {vehicle.alert_type && (
                  <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={12} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-red-900 dark:text-red-200 font-medium">{vehicle.alert_type}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <TrendingUp size={12} className="flex-shrink-0" />
                    <span>{vehicle.speed} km/h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Clock size={12} className="flex-shrink-0" />
                    <span>{getTimeSinceLastPing(vehicle.lastPing)}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{vehicle.location}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {mockVehicles.filter(v => v.status === 'Moving').length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Moving</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {mockVehicles.filter(v => v.status === 'Idling').length}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Idling</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {alertCount}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Alerts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Map Stage */}
      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {/* Tactical Grid Background */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none"></div>

        {/* Floating KPI Cards */}
        <div className="absolute top-6 left-6 right-6 z-10 flex gap-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg rounded-xl p-4 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={16} className="text-green-600 dark:text-green-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Fleet</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {mockVehicles.filter(v => v.status === 'Moving').length}
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-1">/ {mockVehicles.length}</span>
            </p>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg rounded-xl p-4 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Live Alerts</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{alertCount}</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg rounded-xl p-4 min-w-[180px] ml-auto">
            <div className="flex items-center gap-2 mb-1">
              <Wifi size={16} className="text-green-600 dark:text-green-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Geotab Sync</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">99.8%</p>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20 animate-pulse">
              <Navigation size={32} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Live Telemetry Map</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Mapbox / Google Maps GL canvas will render here, displaying real-time clustering and directional tracking for the entire fleet.
            </p>
            {selectedVehicle && (
              <div className="mt-6 p-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg max-w-md mx-auto shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  {getStatusDot(selectedVehicle.status)}
                  <span className="text-lg font-semibold text-slate-100">{selectedVehicle.vrn}</span>
                  <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedVehicle.status)}`}>
                    {getStatusIcon(selectedVehicle.status)}
                    {selectedVehicle.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-left">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={14} />
                    <span className="text-slate-300">{selectedVehicle.driver}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">{selectedVehicle.fleet_group}</span>
                  </div>

                  {selectedVehicle.alert_type && (
                    <div className="p-2 bg-red-900/30 border border-red-800 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-red-200 text-xs font-medium">{selectedVehicle.alert_type}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-700">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <TrendingUp size={14} />
                      <span className="text-slate-300">{selectedVehicle.speed} km/h</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={14} />
                      <span className="text-slate-300">{getTimeSinceLastPing(selectedVehicle.lastPing)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-400 pt-2 border-t border-slate-700">
                    <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{selectedVehicle.location}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">Coordinates</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Left Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg p-4 shadow-lg z-10">
          <div className="text-xs font-semibold text-slate-300 mb-3">Vehicle Status</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-xs text-slate-400">Moving</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-xs text-slate-400">Idling</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-xs text-slate-400">Alert</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              <span className="text-xs text-slate-400">Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
