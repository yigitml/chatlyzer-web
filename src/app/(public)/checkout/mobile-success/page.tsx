import { redirect } from "next/navigation";

export default async function MobileCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const resolvedParams = await searchParams;
  const redirectTarget = resolvedParams?.redirect || "chatlyzer://checkout/success";
  
  // Next.js redirect() throws an error to halt execution and send a 307 response.
  // This server-side redirect is required for ASWebAuthenticationSession (Expo WebBrowser)
  // to properly intercept the URL and close the modal.
  redirect(redirectTarget);
}
