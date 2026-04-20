import { Suspense } from "react";
import { Shell, TopBar } from "@/components/Shell";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <Suspense fallback={<div className="p-6">Carregando…</div>}>
          <CheckoutClient />
        </Suspense>
      </Shell>
    </>
  );
}
