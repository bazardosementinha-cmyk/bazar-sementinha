export type PixBrCodeInput = {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
  description?: string;
};

function onlyAscii(value: string, maxLength: number) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, maxLength);
}

function emv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16Ccitt(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizedAmount(value: number) {
  const amount = Number.isFinite(value) ? Math.max(0, value) : 0;
  return amount.toFixed(2);
}

export function sanitizePixTxid(raw: string | null | undefined) {
  const value = String(raw || "BAZAR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 25);
  return value || "BAZAR";
}

export function buildPixBrCode(input: PixBrCodeInput) {
  const key = String(input.key || "").trim();
  const merchantName = onlyAscii(input.merchantName, 25).toUpperCase() || "BAZAR SEMENTINHA";
  const merchantCity = onlyAscii(input.merchantCity, 15).toUpperCase() || "CAMPINAS";
  const txid = sanitizePixTxid(input.txid);
  const description = input.description ? onlyAscii(input.description, 72) : "";

  const gui = emv("00", "br.gov.bcb.pix");
  const pixKey = emv("01", key);
  const pixDescription = description ? emv("02", description) : "";
  const merchantAccountInfo = emv("26", `${gui}${pixKey}${pixDescription}`);
  const additionalData = emv("62", emv("05", txid));

  const withoutCrc = [
    emv("00", "01"),
    merchantAccountInfo,
    emv("52", "0000"),
    emv("53", "986"),
    emv("54", normalizedAmount(input.amount)),
    emv("58", "BR"),
    emv("59", merchantName),
    emv("60", merchantCity),
    additionalData,
    "6304",
  ].join("");

  return `${withoutCrc}${crc16Ccitt(withoutCrc)}`;
}
