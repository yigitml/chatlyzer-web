"use client";

import {
  ErrorCode,
  type Package,
  Purchases,
  PurchasesError,
} from "@revenuecat/purchases-js";
import type { User } from "../../generated/client";

const DEFAULT_CREDITS_PRODUCT_ID = "credits_24";

let configuredUserId: string | null = null;

function getRevenueCatWebApiKey() {
  return process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || "";
}

function getCreditsProductId() {
  return (
    process.env.NEXT_PUBLIC_REVENUECAT_CREDITS_PRODUCT_ID ||
    process.env.REVENUECAT_CREDITS_PRODUCT_ID ||
    DEFAULT_CREDITS_PRODUCT_ID
  );
}

async function getPurchasesForUser(user: User) {
  const apiKey = getRevenueCatWebApiKey();
  if (!apiKey) {
    throw new Error("RevenueCat web API key is not configured.");
  }

  if (!Purchases.isConfigured()) {
    configuredUserId = user.id;
    const purchases = Purchases.configure({
      apiKey,
      appUserId: user.id,
    });
    void purchases.setAttributes({
      $email: user.email,
      $displayName: user.name,
    }).catch((error) => {
      console.warn("[RevenueCat] Failed to set web customer attributes:", error);
    });
    return purchases;
  }

  const purchases = Purchases.getSharedInstance();
  if (configuredUserId !== user.id) {
    await purchases.changeUser(user.id);
    configuredUserId = user.id;
  }

  return purchases;
}

function findCreditsPackage(packages: Package[]) {
  const productId = getCreditsProductId();
  return packages.find(
    (pkg) =>
      pkg.webBillingProduct.identifier === productId ||
      pkg.rcBillingProduct.identifier === productId,
  );
}

export function isRevenueCatUserCancellation(error: unknown) {
  return (
    error instanceof PurchasesError &&
    error.errorCode === ErrorCode.UserCancelledError
  );
}

export async function purchaseRevenueCatCredits(user: User) {
  const purchases = await getPurchasesForUser(user);
  const offerings = await purchases.getOfferings();
  const packages = Object.values(offerings.all).flatMap(
    (offering) => offering.availablePackages,
  );
  const creditsPackage = findCreditsPackage(packages);

  if (!creditsPackage) {
    throw new Error(
      `RevenueCat credits product not found: ${getCreditsProductId()}`,
    );
  }

  return purchases.purchase({
    rcPackage: creditsPackage,
    customerEmail: user.email,
    metadata: {
      app_user_id: user.id,
      source: "chatlyzer-web",
    },
    skipSuccessPage: true,
  });
}
