const FIELD_SELECTOR =
  'input:not([type="radio"]):not([type="checkbox"]):not([type="datetime-local"]), select, textarea';

function errorElFor(field: HTMLElement): HTMLElement {
  const id = field.id + "_error";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("p");
    el.id = id;
    el.className = "field_error";
    field.insertAdjacentElement("afterend", el);
  }
  return el;
}

function refresh(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const el = errorElFor(field);
  if (field.validity.valid) {
    el.textContent = "";
    field.setAttribute("aria-invalid", "false");
  } else {
    el.textContent = field.validationMessage;
    field.setAttribute("aria-invalid", "true");
  }
}

export function initValidation(form: HTMLFormElement): void {
  const fields = form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(FIELD_SELECTOR);
  fields.forEach((field) => {
    field.addEventListener("blur", () => refresh(field));

    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") refresh(field);
    });
  });
}

export function showAllErrors(form: HTMLFormElement): void {
  form
    .querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >(FIELD_SELECTOR)
    .forEach(refresh);
}
