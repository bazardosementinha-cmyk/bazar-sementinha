export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatBRL(value: number | null | undefined) {
  const v = typeof value === "number" ? value : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ItemStatus = "review" | "available" | "reserved" | "sold" | "donated" | "archived";

export function statusLabel(status: ItemStatus) {
  switch (status) {
    case "review": return "Em revisão";
    case "available": return "Disponível";
    case "reserved": return "Reservado";
    case "sold": return "Vendido";
    case "donated": return "Doado";
    case "archived": return "Arquivado";
    default: return status;
  }
}
