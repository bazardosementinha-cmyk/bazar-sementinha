import { Shell, TopBar } from "@/components/Shell";
import CustomerLoginClient from "./CustomerLoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <TopBar />
      <Shell>
        <CustomerLoginClient />
      </Shell>
    </>
  );
}
