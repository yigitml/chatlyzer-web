import { Webhooks } from "@polar-sh/nextjs"

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    console.log(payload)
  },

  // BILLING EVENTS
  // Checkout

  onCheckoutCreated: async (payload) => {
    console.log(payload)
  },
  onCheckoutUpdated: async (payload) => {
    console.log(payload)
  },

  // Customers

  onCustomerCreated: async (payload) => {
    console.log(payload)
  },
  onCustomerUpdated: async (payload) => {
    console.log(payload)
  },
  onCustomerDeleted: async (payload) => {
    console.log(payload)
  },
  onCustomerStateChanged: async (payload) => {
    console.log(payload)
  },

  // Subscriptions

  onSubscriptionCreated: async (payload) => {
    console.log(payload)
  },
  onSubscriptionUpdated: async (payload) => {
    console.log(payload)
  },
  onSubscriptionActive: async (payload) => {
    console.log(payload)
  },
  onSubscriptionCanceled: async (payload) => {
    console.log(payload)
  },
  onSubscriptionUncanceled: async (payload) => {
    console.log(payload)
  },
  onSubscriptionRevoked: async (payload) => {
    console.log(payload)
  },

  // Order

  onOrderCreated: async (payload) => {
    console.log(payload)
  },
  onOrderPaid: async (payload) => {
    console.log(payload)
  },
  onOrderUpdated: async (payload) => {
    console.log(payload)
  },
  onOrderRefunded: async (payload) => {
    console.log(payload)
  },

  // Refunds

  onRefundCreated: async (payload) => {
    console.log(payload)
  },
  onRefundUpdated: async (payload) => {
    console.log(payload)
  },

  // Benefit Grants

  onBenefitGrantCreated: async (payload) => {
    console.log(payload)
  },
  onBenefitGrantUpdated: async (payload) => {
    console.log(payload)
  },
  onBenefitGrantRevoked: async (payload) => {
    console.log(payload)
  },
  
  // ORGANIZATION EVENTS
  // Benefits

  onBenefitCreated: async (payload) => {
    console.log(payload)
  },
  onBenefitUpdated: async (payload) => {
    console.log(payload)
  },
  
  // Products

  onProductCreated: async (payload) => {
    console.log(payload)
  },
  onProductUpdated: async (payload) => {
    console.log(payload)
  },

  // Organization

  onOrganizationUpdated: async (payload) => {
    console.log(payload)
  }
})
