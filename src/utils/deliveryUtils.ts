import { SavedDelivery } from "@/components/SavedDeliveriesCard";

const SAVED_DELIVERIES_KEY = 'savedDeliveries';

export interface DeliveryData {
  id: string;
  deliveryNoteNumber: string;
  date: string;
  customer: string;
  items: number;
  total: number;
  paymentMethod: string;
  status: "completed" | "in-transit" | "pending" | "delivered" | "cancelled";
  itemsList?: any[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  amountReceived?: number;
  change?: number;
  vehicle?: string;
  driver?: string;
  deliveryNotes?: string;
}

export const saveDelivery = (delivery: DeliveryData): void => {
  try {
    const savedDeliveries = getSavedDeliveries();
    // Add the new delivery to the list
    const updatedDeliveries = [...savedDeliveries, delivery];
    localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
  } catch (error) {
    console.error('Error saving delivery:', error);
    throw new Error('Failed to save delivery');
  }
};

export const getSavedDeliveries = (): DeliveryData[] => {
  try {
    const saved = localStorage.getItem(SAVED_DELIVERIES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error retrieving saved deliveries:', error);
    return [];
  }
};

export const deleteDelivery = (deliveryId: string): void => {
  try {
    const savedDeliveries = getSavedDeliveries();
    const updatedDeliveries = savedDeliveries.filter(delivery => delivery.id !== deliveryId);
    localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
  } catch (error) {
    console.error('Error deleting delivery:', error);
    throw new Error('Failed to delete delivery');
  }
};

export const updateDelivery = (updatedDelivery: DeliveryData): void => {
  try {
    const savedDeliveries = getSavedDeliveries();
    const updatedDeliveries = savedDeliveries.map(delivery => 
      delivery.id === updatedDelivery.id ? updatedDelivery : delivery
    );
    localStorage.setItem(SAVED_DELIVERIES_KEY, JSON.stringify(updatedDeliveries));
  } catch (error) {
    console.error('Error updating delivery:', error);
    throw new Error('Failed to update delivery');
  }
};

export const getDeliveryById = (deliveryId: string): DeliveryData | undefined => {
  try {
    const savedDeliveries = getSavedDeliveries();
    return savedDeliveries.find(delivery => delivery.id === deliveryId);
  } catch (error) {
    console.error('Error retrieving delivery by ID:', error);
    return undefined;
  }
};