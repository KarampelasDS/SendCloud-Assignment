import { describe, test, expect, vi, beforeEach } from "vitest";
import { toHMS, buildPayload } from "./submit";

describe("toHMS", () => {
  test("converts seconds properly", () => {
    expect(toHMS(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
    expect(toHMS(90)).toEqual({ hours: 0, minutes: 1, seconds: 30 });
    expect(toHMS(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });

  test("turns negative values to zero", () => {
    expect(toHMS(-100)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
});

describe("buildPayload", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_WEBHOOK_URL", "https://example.com/hook");
  });

  function setupForm(): HTMLFormElement {
    document.body.innerHTML = `
      <form>
        <input name="name" value="Jane" />
        <input name="telephone_number" value="" />
        <input name="city" value="Amsterdam" />
        <select name="country">
          <option value="NL" selected>NL</option>
          <option value="GB">GB</option>
        </select>
        <input name="tax_number" value="" />
        <select name="export_reason">
          <option value="" selected></option>
          <option value="gift">gift</option>
        </select>
        <input name="statements" value="" />
        <input type="radio" name="shipping_preference" value="fast" checked />
        <input type="checkbox" id="insured" name="insured" />
        <input type="radio" name="schedule_mode" value="now" checked />
        <input id="schedule_datetime" value="" />
      </form>`;
    return document.querySelector("form")!;
  }

  test("builds an immediate NL shipment (0/0/0) and injects webhook_url", () => {
    const p = buildPayload(setupForm());
    expect(p.name).toBe("Jane");
    expect(p.country).toBe("NL");
    expect(p.shipping_preference).toBe("fast");
    expect(p.hours).toBe(0);
    expect(p.minutes).toBe(0);
    expect(p.seconds).toBe(0);
    expect(p.webhook_url).toBe("https://example.com/hook");
  });

  test("countries with no customs requirement dont get filled customs fields", () => {
    const p = buildPayload(setupForm());
    expect(p.tax_number).toBeUndefined();
    expect(p.export_reason).toBeUndefined();
  });

  test("includes customs fields for GB", () => {
    const form = setupForm();
    form.querySelector<HTMLSelectElement>('[name="country"]')!.value = "GB";
    form.querySelector<HTMLInputElement>('[name="tax_number"]')!.value =
      "TAX123";
    form.querySelector<HTMLSelectElement>('[name="export_reason"]')!.value =
      "gift";
    const p = buildPayload(form);
    expect(p.tax_number).toBe("TAX123");
    expect(p.export_reason).toBe("gift");
  });
});
