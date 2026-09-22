export const CUSTOMER_SESSION_CHANGED_EVENT = "customer-session-changed";

export function notifyCustomerSessionChanged() {
  window.dispatchEvent(new Event(CUSTOMER_SESSION_CHANGED_EVENT));
}
