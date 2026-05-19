import { redirect } from "next/navigation";

function getRedirectTarget(value: string | undefined): string {
  if (!value) return "chatlyzer://checkout/success";

  try {
    const url = new URL(value);
    if (url.protocol === "chatlyzer:") {
      return value;
    }
  } catch {
    // Fall through to the safe app redirect.
  }

  return "chatlyzer://checkout/success";
}

export default async function MobileCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolvedParams = await searchParams;
  const redirectTarget = getRedirectTarget(resolvedParams?.redirect);
  
  // Next.js redirect() throws an error to halt execution and send a 307 response.
  // This server-side redirect is required for ASWebAuthenticationSession (Expo WebBrowser)
  // to properly intercept the URL and close the modal.
  redirect(redirectTarget);
}
