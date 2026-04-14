import { TopBar } from "@/components/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar
        right={
          <form action="/api/admin/logout" method="post">
            <button className="rounded-full border bg-white px-3 py-1 text-sm font-semibold hover:bg-slate-50">
              Sair
            </button>
          </form>
        }
      />
      {children}
    </>
  );
}
