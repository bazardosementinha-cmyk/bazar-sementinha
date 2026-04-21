import { Suspense } from "react";
import { Shell, TopBar } from "@/components/Shell";
import PedidoTrackingClient from "./PedidoTrackingClient";

export const dynamic = "force-dynamic";

export default function PedidoPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <Suspense fallback={<div className="p-6">Carregando…</div>}>
          <PedidoTrackingClient />
        </Suspense>
      </Shell>
    </>
  );
}
