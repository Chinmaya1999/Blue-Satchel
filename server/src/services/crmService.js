import CRMSyncLog from "../models/CRMSyncLog.js";

/**
 * CRM Integration Service (Section 5.3 "Zoho CRM", Section 6 "CRM Platform")
 * Exposes a stable syncCustomer/syncOrder interface. MockCRMAdapter records
 * every sync as an auditable CRMSyncLog entry (visible in the admin console)
 * instead of calling out to Zoho, so the business workflow and audit trail
 * behave identically once a real ZohoCRMAdapter is dropped in.
 */
class MockCRMAdapter {
  provider = "mock";

  async syncCustomer(user) {
    const remoteId = user.crmContactId || `MOCK-CONTACT-${user._id.toString().slice(-6).toUpperCase()}`;
    await CRMSyncLog.create({
      entityType: "customer",
      entityId: user._id,
      provider: this.provider,
      remoteId,
      status: "success",
      payload: { name: user.name, email: user.email, phone: user.phone, skinType: user.skinType },
      message: "Customer profile synced to CRM contact record.",
    });
    return remoteId;
  }

  async syncOrder(order, user) {
    const remoteId = `MOCK-DEAL-${order.orderNumber}`;
    await CRMSyncLog.create({
      entityType: "order",
      entityId: order._id,
      provider: this.provider,
      remoteId,
      status: "success",
      payload: {
        orderNumber: order.orderNumber,
        total: order.total,
        customerEmail: user?.email,
        items: order.items.length,
      },
      message: "Order synced to CRM as a deal/transaction record.",
    });
    return remoteId;
  }
}

const adapter = new MockCRMAdapter();

export const crmService = {
  syncCustomer: (user) => adapter.syncCustomer(user),
  syncOrder: (order, user) => adapter.syncOrder(order, user),
};
