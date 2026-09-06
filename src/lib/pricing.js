export const FLAT_RATE_PER_VEHICLE = 30;

// A vehicle stops being billable once it's Returned or Sold - everything
// else (including Maintenance, Under Review, Accident Repair) is still the
// client's vehicle and still gets monitored.
export function billableVehicles(vehicles) {
  return vehicles.filter((v) => v.status !== 'Returned' && v.status !== 'Sold');
}

export function amountOwed(vehicles) {
  return billableVehicles(vehicles).length * FLAT_RATE_PER_VEHICLE;
}
