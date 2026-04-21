import { Shell, TopBar } from "@/components/Shell";
import MeusPedidosClient from "./MeusPedidosClient";

export const dynamic = "force-dynamic";

export default function MeusPedidosPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <MeusPedidosClient />
      </Shell>
    </>
  );
}
