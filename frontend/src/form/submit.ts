import { createShipment } from "../api/shipments";
import { CUSTOMS_COUNTRIES } from "../data/options";
import type { NewScheduledShipment } from "../types";

function toSchedule(form: HTMLFormElement) {
  const mode = form.querySelector<HTMLInputElement>(
    'input[name="schedule_mode"]:checked',
  )?.value;

  if (mode !== "later") return { hours: 0, minutes: 0, seconds: 0 };

  const datetime = form.querySelector<HTMLInputElement>("#schedule_datetime");
  const delta = Math.max(
    0,
    Math.round((new Date(datetime?.value ?? "").getTime() - Date.now()) / 1000),
  );

  return {
    hours: Math.floor(delta / 3600),
    minutes: Math.floor((delta % 3600) / 60),
    seconds: delta % 60,
  };
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "").trim();
  return text === "" ? undefined : text;
}

function buildPayload(form: HTMLFormElement): NewScheduledShipment {
  const data = new FormData(form);
  const country = String(data.get("country") ?? "");
  const needsCustoms = CUSTOMS_COUNTRIES.includes(country);

  return {
    name: String(data.get("name") ?? ""),
    telephone_number: optional(data.get("telephone_number")),
    city: String(data.get("city") ?? ""),
    country,
    tax_number: needsCustoms ? optional(data.get("tax_number")) : undefined,
    export_reason: needsCustoms
      ? (optional(
          data.get("export_reason"),
        ) as NewScheduledShipment["export_reason"])
      : undefined,
    statements: needsCustoms ? optional(data.get("statements")) : undefined,
    shipping_preference: String(
      data.get("shipping_preference") ?? "",
    ) as NewScheduledShipment["shipping_preference"],
    insured: form.querySelector<HTMLInputElement>("#insured")?.checked ?? false,
    ...toSchedule(form),
    webhook_url: import.meta.env.VITE_WEBHOOK_URL,
  };
}

export function initSubmit(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>("#form_status");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (button) button.disabled = true;

    try {
      await createShipment(buildPayload(form));

      form.reset();
      // reset() doesn't fire change events, so re-sync the conditional sections
      form
        .querySelector("#recipient_country")
        ?.dispatchEvent(new Event("change"));
      form
        .querySelector('input[name="schedule_mode"]:checked')
        ?.dispatchEvent(new Event("change"));

      if (status) {
        status.textContent = "Shipment scheduled successfully.";
        status.className = "form_status form_status_ok";
      }
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error ? error.message : "Something went wrong.";
        status.className = "form_status form_status_error";
      }
    } finally {
      if (button) button.disabled = false;
    }
  });
}
