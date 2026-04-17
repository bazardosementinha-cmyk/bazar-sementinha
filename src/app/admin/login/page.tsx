import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4 text-slate-600">
          Carregando...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
