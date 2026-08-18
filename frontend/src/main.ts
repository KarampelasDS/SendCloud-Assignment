import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";

import { COUNTRIES, EXPORT_REASONS, type SelectOption } from "./data/options";

import { initSchedule } from "./form/schedule";
import { initCustoms } from "./form/customs";
import { initValidation } from "./form/validation";
import { initSubmit } from "./form/submit";

const form = document.querySelector<HTMLFormElement>("form");
if (form) {
  initCustoms(form);
  initSchedule(form);
  initValidation(form);
  initSubmit(form);
}

function fillSelectOptions(
  select: HTMLSelectElement,
  options: SelectOption[],
): void {
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    select.appendChild(optionElement);
  });
}

const countrySelect =
  document.querySelector<HTMLSelectElement>("#recipient_country");
if (countrySelect) {
  fillSelectOptions(countrySelect, COUNTRIES);
}

const reasonSelect = document.querySelector<HTMLSelectElement>(
  "#customs_export_reason",
);
if (reasonSelect) {
  fillSelectOptions(reasonSelect, EXPORT_REASONS);
}
