/** Guest-facing hotel information, edited in Settings and used by the guest concierge. */
export const GUEST_INFO_KEY = "guest.info";

export interface GuestInfo {
  checkInTime: string;
  checkOutTime: string;
  lateCheckout: string;
  wifiNetwork: string;
  wifiPassword: string;
  wifiNotes: string;
  transferAvailable: boolean;
  transferPrice: string;
  transferNotice: string;
  transferHours: string;
  transferNotes: string;
  extra: string;
}

export const DEFAULT_GUEST_INFO: GuestInfo = {
  checkInTime: "14:00",
  checkOutTime: "11:00",
  lateCheckout: "",
  wifiNetwork: "",
  wifiPassword: "",
  wifiNotes: "",
  transferAvailable: true,
  transferPrice: "",
  transferNotice: "",
  transferHours: "",
  transferNotes: "",
  extra: "",
};

export function parseGuestInfo(value: unknown): GuestInfo {
  if (!value || typeof value !== "object") return { ...DEFAULT_GUEST_INFO };
  return { ...DEFAULT_GUEST_INFO, ...(value as Partial<GuestInfo>) };
}

/** Plain-language facts for the concierge's instructions. */
export function guestInfoToPrompt(info: GuestInfo): string {
  const lines = [
    `Check-in from ${info.checkInTime}. Check-out by ${info.checkOutTime}.`,
    info.lateCheckout && `Late check-out: ${info.lateCheckout}.`,
    info.wifiNetwork
      ? `Wi-Fi network "${info.wifiNetwork}"${info.wifiPassword ? `, password "${info.wifiPassword}"` : ", no password"}.`
      : "Wi-Fi is available; ask reception for the details.",
    info.wifiNotes && `Wi-Fi notes: ${info.wifiNotes}.`,
    info.transferAvailable
      ? [
          "Airport transfers are available",
          info.transferPrice && `price ${info.transferPrice}`,
          info.transferNotice && `book ${info.transferNotice}`,
          info.transferHours && `hours ${info.transferHours}`,
        ]
          .filter(Boolean)
          .join(", ") + "." + (info.transferNotes ? ` ${info.transferNotes}` : "")
      : "Airport transfers are not offered by the hotel.",
    info.extra && `Other information: ${info.extra}`,
  ];
  return lines.filter(Boolean).join("\n");
}
