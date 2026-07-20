'use client';

// Staff mode = the shared kitchen device is locked to the Orders board,
// operating as a specific staff member. Stored locally on the device.

const KEY = 'qrmenu_staff_mode';

export function getStaffMode() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function setStaffMode(value) {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } else {
    window.localStorage.removeItem(KEY);
  }
  window.dispatchEvent(new Event('qrmenu-staff-mode'));
}

export function onStaffModeChange(handler) {
  window.addEventListener('qrmenu-staff-mode', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('qrmenu-staff-mode', handler);
    window.removeEventListener('storage', handler);
  };
}
