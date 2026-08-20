import { describe, test, expect } from "vitest";
import { initSchedule } from "./schedule";

function setupForm(): HTMLFormElement {
  document.body.innerHTML = `
    <form>
      <input type="radio" id="schedule_now" name="schedule_mode" value="now" checked />
      <input type="radio" id="schedule_later" name="schedule_mode" value="later" />
      <div id="schedule_fields">
        <input id="schedule_datetime" />
        <p id="schedule_datetime_message"></p>
      </div>
      <p id="schedule_summary"></p>
    </form>`;
  return document.querySelector("form")!;
}

function selectLater(form: HTMLFormElement) {
  const later = form.querySelector<HTMLInputElement>("#schedule_later")!;
  later.checked = true;
  later.dispatchEvent(new Event("change"));
}

describe("schedule control", () => {
  test("hides the picker and unrequires it if immediate shipment is selected", () => {
    const form = setupForm();
    initSchedule(form);
    expect(
      form.querySelector<HTMLElement>("#schedule_fields")!.style.display,
    ).toBe("none");
    expect(
      form.querySelector<HTMLInputElement>("#schedule_datetime")!.required,
    ).toBe(false);
  });

  test("reveals and requires the picker if schedule for later is selected", () => {
    const form = setupForm();
    initSchedule(form);
    selectLater(form);
    expect(
      form.querySelector<HTMLElement>("#schedule_fields")!.style.display,
    ).toBe("flex");
    expect(
      form.querySelector<HTMLInputElement>("#schedule_datetime")!.required,
    ).toBe(true);
  });

  test("marks a past date as invalid", () => {
    const form = setupForm();
    initSchedule(form);
    selectLater(form);
    const dt = form.querySelector<HTMLInputElement>("#schedule_datetime")!;
    dt.value = "2000-01-01T00:00:00";
    dt.dispatchEvent(new Event("input"));
    expect(dt.getAttribute("aria-invalid")).toBe("true");
  });

  test("accepts a future date", () => {
    const form = setupForm();
    initSchedule(form);
    selectLater(form);
    const dt = form.querySelector<HTMLInputElement>("#schedule_datetime")!;
    dt.value = "2999-01-01T00:00:00";
    dt.dispatchEvent(new Event("input"));
    expect(dt.getAttribute("aria-invalid")).toBe("false");
  });
});
