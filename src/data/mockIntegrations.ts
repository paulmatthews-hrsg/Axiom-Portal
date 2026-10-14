export const mockFleetioData = [
  {
    vehicle_id: "v-88392",
    vrn: "ABC123",
    asset_id: "FLEETCAR-8392",
    make: "Toyota",
    model: "Camry",
    year: 2023,
    color: "White",
    registration_state: "NT",
    fleet_group: "Marine Pool #4",
    current_assignment: {
      contact_id: "cor-9921",
      driver_name: "Pending COR Identification",
      cor_officer: "Capt. Sarah Jenkins",
      assignment_start: "2026-02-10T08:00:00Z"
    }
  },
  {
    vehicle_id: "v-88393",
    vrn: "XYZ789",
    asset_id: "GIGCAR-4432",
    make: "Kia",
    model: "Cerato",
    year: 2022,
    color: "Silver",
    registration_state: "NSW",
    fleet_group: "GigCar Rideshare",
    current_assignment: {
      contact_id: "g-4432",
      driver_name: "John Smith",
      cor_officer: "N/A",
      assignment_start: "2025-11-01T09:00:00Z"
    }
  },
  {
    vehicle_id: "v-88394",
    vrn: "DEF456",
    asset_id: "YONDER-5521",
    make: "Hyundai",
    model: "i30",
    year: 2024,
    color: "Blue",
    registration_state: "VIC",
    fleet_group: "Yonder Pool",
    current_assignment: {
      contact_id: "y-5521",
      driver_name: "Sarah Wilson",
      cor_officer: "N/A",
      assignment_start: "2026-01-15T08:00:00Z"
    }
  }
];

export const mockGeotabData = [
  {
    trip_id: "gt-104857",
    vrn: "ABC123",
    date: "2026-02-24",
    offence_time: "14:22:00",
    offence_type: "Speeding",
    telemetry_at_offence: {
      latitude: "-27.4698",
      longitude: "153.0251",
      speed_kmh: 82,
      posted_limit: 60,
      ignition_status: "ON",
      trip_status: "In Motion",
      location_description: "M3 Pacific Motorway, Southbound"
    },
    driver_identification: {
      method: "Fleetio API",
      driver_name: "Pending COR Identification",
      verified: false,
      source: "Verified via Fleetio API (Current Operator)",
      bookingReference: "FLT-10293",
      nfc_id: "NFC-8392-KF"
    },
    exception_match: true
  },
  {
    trip_id: "gt-104858",
    vrn: "XYZ789",
    date: "2026-02-20",
    offence_time: "09:15:00",
    offence_type: "Speeding",
    telemetry_at_offence: {
      latitude: "-33.8688",
      longitude: "151.2093",
      speed_kmh: 75,
      posted_limit: 60,
      ignition_status: "ON",
      trip_status: "In Motion",
      location_description: "George Street, Sydney CBD"
    },
    driver_identification: {
      method: "Loopit API",
      driver_name: "John Smith",
      verified: true,
      source: "Verified via Loopit API (Active Booking)",
      bookingReference: "LPT-88392",
      nfc_id: "NFC-4432-KF"
    },
    exception_match: true
  },
  {
    trip_id: "gt-104859",
    vrn: "DEF456",
    date: "2026-02-22",
    offence_time: "16:45:00",
    offence_type: "Parking",
    telemetry_at_offence: {
      latitude: "-37.8136",
      longitude: "144.9631",
      speed_kmh: 0,
      posted_limit: 0,
      ignition_status: "OFF",
      trip_status: "Parked for 2h 14m",
      location_description: "Flinders Street, Melbourne CBD"
    },
    driver_identification: {
      method: "Lodgify API",
      driver_name: "Jane Doe",
      verified: true,
      source: "Verified via Lodgify API (Active Guest)",
      bookingReference: "LDG-99482",
      nfc_id: "NFC-5521-KF"
    },
    exception_match: false
  }
];
