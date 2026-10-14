import { useState } from 'react';
import { Car, UploadCloud, FileSpreadsheet, Plus, Save, Info, Download, FileText, CheckCircle, X, AlertCircle, Repeat, Package, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleRegistryTable } from './VehicleRegistryTable';

interface FleetAssetsProps {
  currentView: string;
}

export default function FleetAssets({ currentView }: FleetAssetsProps) {
  const tenantGroups = ["Global Fleet", "North Region|NYC", "North Region|Boston", "South Region|Miami"];

  const [vehicleName, setVehicleName] = useState('');
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleGroup, setVehicleGroup] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [showFlipacarModal, setShowFlipacarModal] = useState(false);
  const [odometerReading, setOdometerReading] = useState('86024');
  const [assetCondition, setAssetCondition] = useState('Good');
  const [reservePrice, setReservePrice] = useState('');
  const [vehicleLocation, setVehicleLocation] = useState('Berrimah Storage');
  const [isFlipacarSubmitting, setIsFlipacarSubmitting] = useState(false);

  const downloadTemplate = () => {
    const csvContent = "Vehicle Name,VIN,License Plate,Group\nTesla Model 3 - Fleet 001,5YJ3E1EA7KF123456,ABC123,Sydney Fleet\nToyota Camry - Fleet 002,4T1B11HK8KU123456,XYZ789,Melbourne Fleet";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pennyos_fleet_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    return `${Math.round(bytes / 1024)} KB`;
  };

  const removeFile = () => {
    setCsvFile(null);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleName.trim()) return;

    setIsSubmitting(true);
    setSubmitSuccess(false);

    const payload = {
      name: vehicleName,
      vin: vin || null,
      license_plate: licensePlate || null,
      group_hierarchy: vehicleGroup || null,
      primary_meter_unit: "km",
      vehicle_status_id: 1,
      vehicle_type_id: 3
    };

    await new Promise(r => setTimeout(r, 800));

    console.log("Fleetio API Payload:", payload);

    toast.success(`Vehicle Added: ${vehicleName} has been provisioned.`, {
      duration: 3500,
      className: 'bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-800 text-sm font-medium',
      classNames: {
        icon: 'text-green-500'
      }
    });

    setSubmitSuccess(true);
    setIsSubmitting(false);

    setTimeout(() => {
      setVehicleName('');
      setVin('');
      setLicensePlate('');
      setVehicleGroup('');
      setSubmitSuccess(false);
    }, 2000);
  };

  const handleBulkProvision = async () => {
    setIsProvisioning(true);

    const mockPayload = {
      job_type: "bulk_vehicle_import",
      total_records: 150,
      valid_records: 148,
      invalid_records: 2,
      vehicles: [
        {
          name: "Tesla Model 3 - Fleet 001",
          vin: "5YJ3E1EA7KF123456",
          license_plate: "ABC123",
          group_hierarchy: "Sydney Fleet",
          primary_meter_unit: "km",
          vehicle_status_id: 1,
          vehicle_type_id: 3
        },
        {
          name: "Toyota Camry - Fleet 002",
          vin: "4T1B11HK8KU123456",
          license_plate: "XYZ789",
          group_hierarchy: "Melbourne Fleet",
          primary_meter_unit: "km",
          vehicle_status_id: 1,
          vehicle_type_id: 3
        }
      ],
      integration_targets: ["Fleetio", "Loopit", "DingGo"],
      timestamp: new Date().toISOString()
    };

    await new Promise(r => setTimeout(r, 1500));

    console.log("Fleetio Bulk API Job Submission:", mockPayload);

    toast.success('Bulk Import Complete: 148 vehicles provisioned.', {
      duration: 3500,
      className: 'bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-800 text-sm font-medium',
      classNames: {
        icon: 'text-green-500'
      }
    });

    setShowReviewModal(false);
    setCsvFile(null);
    setIsProvisioning(false);
  };

  const handleFlipacarSubmit = async () => {
    setIsFlipacarSubmitting(true);

    const payload = {
      integration: "flipacar",
      vehicle: {
        name: "2019 Toyota Hiace Commuter",
        vin: "JTFST22P100038950",
        license_plate: "CD51UG"
      },
      listing_details: {
        final_odometer_km: parseInt(odometerReading),
        asset_condition: assetCondition,
        reserve_price_aud: reservePrice ? parseFloat(reservePrice) : null,
        vehicle_location: vehicleLocation
      },
      timestamp: new Date().toISOString()
    };

    await new Promise(r => setTimeout(r, 1000));

    console.log("Flipacar API Payload:", payload);

    toast.success('Vehicle De-fleeted: Draft listing created in Flipacar.', {
      duration: 3500,
      className: 'bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg border border-slate-800 text-sm font-medium',
      classNames: {
        icon: 'text-green-500'
      }
    });

    setShowFlipacarModal(false);
    setIsFlipacarSubmitting(false);
    setOdometerReading('86024');
    setAssetCondition('Good');
    setReservePrice('');
    setVehicleLocation('Berrimah Storage');
  };

  // Registry View
  if (currentView === 'fleet-assets-registry') {
    return <VehicleRegistryTable />;
  }

  // Disposal View
  if (currentView === 'fleet-assets-disposal') {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Repeat className="text-purple-600" /> De-fleet & Disposal
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage vehicle disposal and remarketing through Flipacar
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Repeat size={20} className="text-purple-600" /> Remarketing Integration
                <span className="ml-3 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Connected</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Send vehicles for disposal through our integrated Flipacar remarketing platform. Create auction listings with vehicle condition, odometer readings, and reserve pricing.
              </p>
            </div>
            <button
              onClick={() => setShowFlipacarModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-150 active:scale-95 flex items-center gap-2 font-medium shrink-0"
            >
              <Repeat size={18} />
              Test Vehicle Disposal (Flipacar)
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Disposal Queue</h2>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8">
            <div className="text-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-full p-4 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Package size={48} className="text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                No vehicles currently marked for disposal
              </p>
            </div>
          </div>
        </div>

        {/* Flipacar De-fleet Modal */}
        {showFlipacarModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                      De-fleet & Send to Flipacar
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Create auction listing for vehicle disposal
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFlipacarModal(false)}
                    disabled={isFlipacarSubmitting}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X size={20} className="text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Read-only Vehicle Data */}
                <div className="mb-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                    Vehicle Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Vehicle:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">2019 Toyota Hiace Commuter</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">VIN:</span>
                      <span className="text-sm font-mono text-slate-900 dark:text-white">JTFST22P100038950</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Plate:</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">CD51UG</span>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Final Odometer Reading
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={odometerReading}
                        onChange={(e) => setOdometerReading(e.target.value)}
                        className="w-full px-3 py-2 pr-12 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                        disabled={isFlipacarSubmitting}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
                        km
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Asset Condition
                    </label>
                    <select
                      value={assetCondition}
                      onChange={(e) => setAssetCondition(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                      disabled={isFlipacarSubmitting}
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Damaged">Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Reserve Price / Floor
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                        $
                      </span>
                      <input
                        type="number"
                        value={reservePrice}
                        onChange={(e) => setReservePrice(e.target.value)}
                        placeholder="Optional"
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                        disabled={isFlipacarSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Vehicle Location
                    </label>
                    <input
                      type="text"
                      value={vehicleLocation}
                      onChange={(e) => setVehicleLocation(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                      disabled={isFlipacarSubmitting}
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm flex gap-2 items-start">
                  <Info size={16} className="mt-0.5 shrink-0" />
                  <p>
                    This will create a draft auction listing in Flipacar's remarketing platform. You can finalize photos and descriptions in their portal.
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
                <button
                  onClick={() => setShowFlipacarModal(false)}
                  disabled={isFlipacarSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFlipacarSubmit}
                  disabled={isFlipacarSubmitting}
                  className={`px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium transition-all duration-150 active:scale-95 flex items-center gap-2 ${
                    isFlipacarSubmitting
                      ? 'opacity-70 cursor-not-allowed'
                      : 'hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  <Repeat size={18} />
                  {isFlipacarSubmitting ? 'Pushing to Flipacar...' : 'Create Flipacar Listing'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Acquisition View (default and fleet-assets-acquisition)
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PackagePlus className="text-blue-600" /> Vehicle Acquisition
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Provision new vehicles and seamlessly sync them across Fleetio, Loopit, and DingGo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: The Scalpel (Manual Entry) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-full flex flex-col">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus size={20} /> Quick Add Vehicle
          </h2>

          <form onSubmit={handleQuickAddSubmit} className="flex flex-col h-full">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  placeholder="e.g., Tesla Model 3 - Fleet 001"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  VIN <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase())}
                    placeholder="e.g., 5YJ3E1EA7KF123456"
                    maxLength={17}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {vin.length}/17
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  License Plate <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g., ABC123"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Group <span className="text-gray-400 text-xs font-normal ml-1">(optional)</span>
                </label>
                <select
                  value={vehicleGroup}
                  onChange={(e) => setVehicleGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                >
                  <option value="">Select a group...</option>
                  {tenantGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm flex gap-2 items-start">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>Perfect for adding one-off vehicles. Use CSV import for bulk additions.</p>
              </div>
              <button
                type="submit"
                disabled={!vehicleName.trim() || isSubmitting}
                className={`w-full font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  submitSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : isSubmitting
                    ? 'bg-blue-600 text-white opacity-70 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-slate-700 text-white disabled:text-gray-500 dark:disabled:text-gray-400'
                }`}
              >
                {submitSuccess ? (
                  <>
                    <CheckCircle size={18} />
                    Added!
                  </>
                ) : isSubmitting ? (
                  <>
                    <Save size={18} className="animate-pulse" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Vehicle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: The Sledgehammer (CSV Upload) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-full flex flex-col">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet size={20} /> Bulk Import (CSV)
          </h2>

          <div
            className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : csvFile
                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              setCsvFile(e.dataTransfer.files[0]);
            }}
          >
            {csvFile ? (
              <>
                <CheckCircle
                  size={48}
                  className="mb-4 text-emerald-500"
                />
                <p className="text-center font-medium mb-1 text-slate-900 dark:text-white">
                  {csvFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  {formatFileSize(csvFile.size)}
                </p>
                <button
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm cursor-pointer font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <X size={16} />
                  Remove File
                </button>
              </>
            ) : (
              <>
                <UploadCloud
                  size={48}
                  className={`mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
                />
                <p className="text-center font-medium mb-1 text-slate-900 dark:text-white">
                  Drag and drop your vehicle roster CSV here
                </p>
                <p className="text-sm text-slate-500 text-center mb-4">
                  or click to browse from your computer
                </p>
                <label className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
                  Select File
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </>
            )}
          </div>

          <div className="mt-auto pt-6">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex gap-2 items-start">
              <Info size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="mb-2">
                  Supports the standard PennyOS format: <strong>Vehicle Name, VIN, License Plate, Group</strong>.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline underline-offset-2 font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  Download CSV Template
                </button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm flex gap-2 items-start">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>Imported vehicles will automatically provision across Fleetio, Loopit, and DingGo.</p>
            </div>

            <button
              disabled={!csvFile || isSubmitting}
              onClick={() => setShowReviewModal(true)}
              className={`w-full font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                csvFile && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <UploadCloud size={18} />
              Process Import
            </button>
          </div>
        </div>
      </div>

      {/* Review Import Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                Review Bulk Import
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Review the parsed CSV data before provisioning to integrated apps.
              </p>
            </div>

            {/* Summary Metrics */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Found</div>
                  <div className="text-2xl font-semibold text-slate-900 dark:text-white">150</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg p-4">
                  <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Ready to Provision</div>
                  <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">148</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                  <div className="text-sm text-amber-600 dark:text-amber-400 mb-1">Action Required</div>
                  <div className="text-2xl font-semibold text-amber-700 dark:text-amber-300">2</div>
                </div>
              </div>
            </div>

            {/* Data Table Preview */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(60vh-200px)] border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Vehicle Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">VIN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">License Plate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Group</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">ACRISS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900">
                    {/* Success Row 1 */}
                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CheckCircle size={20} className="text-emerald-500" />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white whitespace-nowrap">12 Pax Van - 54780</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">JTFHB8CP006054780</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">CD51UG</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">HRSG Australasia|Yonder</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">12 Pax Van</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          XVAD
                        </span>
                      </td>
                    </tr>
                    {/* Success Row 2 */}
                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CheckCircle size={20} className="text-emerald-500" />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white whitespace-nowrap">12 Pax Van - CD51UI</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">JTFST22P000038695</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">CD51UI</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">HRSG Australasia|Storage</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">12 Pax Van</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          XVAD
                        </span>
                      </td>
                    </tr>
                    {/* Error Row 1 - Missing Name */}
                    <tr className="bg-red-50 dark:bg-red-900/10 border-b border-slate-100 dark:border-slate-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AlertCircle size={20} className="text-red-500" />
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Missing Vehicle Name</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">2HGFC2F5XWH123456</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">GHI789</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Global Fleet</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Sedan</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          CCAR
                        </span>
                      </td>
                    </tr>
                    {/* Error Row 2 - Duplicate VIN */}
                    <tr className="bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <AlertCircle size={20} className="text-red-500" />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white whitespace-nowrap">Ford Explorer - Fleet 005</td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Duplicate VIN</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">JKL012</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">North Region</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">SUV</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          SFAR
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end items-center">
              <button
                onClick={() => setShowReviewModal(false)}
                disabled={isProvisioning}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Import
              </button>
              <button
                onClick={handleBulkProvision}
                disabled={isProvisioning}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isProvisioning
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:bg-blue-700'
                }`}
              >
                <CheckCircle size={18} />
                {isProvisioning ? 'Provisioning...' : 'Confirm & Provision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
