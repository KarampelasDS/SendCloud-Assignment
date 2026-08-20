import { describe, test, expect } from "vitest";
import { initCustoms } from "./customs";

function setupForm() {
  document.body.innerHTML = `
    <form>
      <select id="recipient_country">
        <option value="NL">NL</option>
        <option value="GB">GB</option>
      </select>
      <fieldset id="customs">
        <input id="customs_tax_number" />
        <select id="customs_export_reason"></select>
      </fieldset>
    </form>
  `;
  return document.querySelector("form")!;
}

describe("customs toggle", () => {
  test("hides customs and un-requires fields for NL", () => {
    const form = setupForm();
    form.querySelector<HTMLSelectElement>("#recipient_country")!.value = "NL";

    initCustoms(form);

    expect(form.querySelector<HTMLElement>("#customs")!.style.display).toBe(
      "none",
    );
    expect(
      form.querySelector<HTMLInputElement>("#customs_tax_number")!.required,
    ).toBe(false);
  });

  test("shows customs and requires fields for GB", () => {
    const form = setupForm();
    form.querySelector<HTMLSelectElement>("#recipient_country")!.value = "GB";

    initCustoms(form);

    expect(form.querySelector<HTMLElement>("#customs")!.style.display).toBe(
      "block",
    );
    expect(
      form.querySelector<HTMLInputElement>("#customs_tax_number")!.required,
    ).toBe(true);
  });

  test("reacts on country change", () => {
    const form = setupForm();
    initCustoms(form);

    const country =
      form.querySelector<HTMLSelectElement>("#recipient_country")!;
    country.value = "GB";
    country.dispatchEvent(new Event("change"));

    expect(form.querySelector<HTMLElement>("#customs")!.style.display).toBe(
      "block",
    );
  });
});
