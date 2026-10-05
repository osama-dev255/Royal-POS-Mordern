// Utility for resolving the active outlet's business identity on documents
// The active outlet is cached by OutletLayout when entering an outlet context
// and cleared on exit, so master-module documents keep using business settings.

const ACTIVE_OUTLET_KEY = 'activeOutletInfo';

export interface ActiveOutletInfo {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  email?: string;
}

export const setActiveOutletInfo = (outlet: ActiveOutletInfo): void => {
  try {
    localStorage.setItem(ACTIVE_OUTLET_KEY, JSON.stringify(outlet));
  } catch (error) {
    console.error('Error caching active outlet info:', error);
  }
};

export const clearActiveOutletInfo = (): void => {
  try {
    localStorage.removeItem(ACTIVE_OUTLET_KEY);
  } catch (error) {
    console.error('Error clearing active outlet info:', error);
  }
};

// Returns the active outlet's info, or null when outside outlet context
export const getActiveOutletInfo = (): ActiveOutletInfo | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_OUTLET_KEY);
    if (!raw) return null;
    const info = JSON.parse(raw) as ActiveOutletInfo;
    return info && info.name ? info : null;
  } catch (error) {
    console.error('Error reading active outlet info:', error);
    return null;
  }
};

// Business name for documents: active outlet name first, then business settings
export const getDocumentBusinessName = (): string => {
  return getActiveOutletInfo()?.name
    || localStorage.getItem('businessName')
    || 'KILANGO GROUP LTD';
};
