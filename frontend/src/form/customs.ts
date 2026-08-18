import { CUSTOMS_COUNTRIES } from "../data/options";

export function initCustoms(form: HTMLFormElement): void {
  const country = form.querySelector<HTMLSelectElement>("#recipient_country");
  const customs = form.querySelector<HTMLElement>("#customs");

  const taxNumber = form.querySelector<HTMLInputElement>("#customs_tax_number");
  const exportReason = form.querySelector<HTMLSelectElement>(
    "#customs_export_reason",
  );

  function update() {
    if (!country || !customs || !taxNumber || !exportReason) return;
    const needsCustoms = CUSTOMS_COUNTRIES.includes(country.value);
    customs.style.display = needsCustoms ? "block" : "none";
    taxNumber.required = needsCustoms;
    exportReason.required = needsCustoms;
  }

  country?.addEventListener("change", update);
  update();
}
