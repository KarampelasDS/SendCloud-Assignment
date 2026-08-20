import { createShipment } from "../api/shipments";
import { CUSTOMS_COUNTRIES } from "../data/options";
import type { NewScheduledShipment } from "../types";
import { showAllErrors } from "./validation";

export function toHMS(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

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

  return toHMS(delta);
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
  const status = form.querySelector<HTMLElement>("#form_error");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

  const sendIcon = form.querySelector<HTMLImageElement>("#send_icon");
  const spinner = form.querySelector<HTMLImageElement>("#spinner");

  const successModal =
    document.querySelector<HTMLDialogElement>("#success_modal");

  successModal?.addEventListener("click", (event) => {
    if (event.target === successModal) {
      successModal.close();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      showAllErrors(form);
      return;
    }

    if (button) button.disabled = true;
    if (sendIcon) sendIcon.style.display = "none";
    if (spinner) spinner.style.display = "block";

    try {
      await createShipment(buildPayload(form));
      successModal?.showModal();

      form.reset();
      // reset() doesn't fire change events, so re-sync the conditional sections
      form
        .querySelector("#recipient_country")
        ?.dispatchEvent(new Event("change"));
      form
        .querySelector('input[name="schedule_mode"]:checked')
        ?.dispatchEvent(new Event("change"));

      if (status) {
        status.textContent = "";
        status.style.display = "none";
      }
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error ? error.message : "Something went wrong.";
        status.style.display = "block";
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    } finally {
      if (button) button.disabled = false;
      if (sendIcon) sendIcon.style.display = "block";
      if (spinner) spinner.style.display = "none";
    }
  });
}
