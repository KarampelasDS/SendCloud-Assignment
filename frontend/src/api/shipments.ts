import type { NewScheduledShipment, ScheduledShipmentResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL;

export async function createShipment(
  payload: NewScheduledShipment,
): Promise<ScheduledShipmentResponse> {
  const response = await fetch(`${API_URL}/shipments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Something went wrong. Please try again.";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch (e) {
      console.log(e);
    }
    throw new Error(message);
  }

  return response.json() as Promise<ScheduledShipmentResponse>;
}
