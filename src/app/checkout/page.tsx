import { Shell, TopBar } from "@/components/Shell";
import CheckoutClient from "./CheckoutClient";
import { Suspense } from "react";

export default function CheckoutPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <Suspense
          fallback={
            <div className="p-4 text-sm opacity-70">
              Carregando checkout...
            </div>
          }
        >
          <CheckoutClient />
        </Suspense>
      </Shell>
    </>
  );
}