import { describe, test, expect } from "vitest";
import { initValidation, showAllErrors } from "./validation";

function setupForm(): HTMLFormElement {
  document.body.innerHTML = `<form><input id="name" name="name" required /></form>`;
  return document.querySelector("form")!;
}

describe("field validation", () => {
  test("marks an empty required field invalid on blur", () => {
    const form = setupForm();
    initValidation(form);
    const input = form.querySelector<HTMLInputElement>("#name")!;
    input.dispatchEvent(new Event("blur"));
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById("name_error")).not.toBeNull();
  });

  test("clears the error once the field is valid", () => {
    const form = setupForm();
    initValidation(form);
    const input = form.querySelector<HTMLInputElement>("#name")!;
    input.dispatchEvent(new Event("blur"));
    input.value = "Jane";
    input.dispatchEvent(new Event("input"));
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(document.getElementById("name_error")!.textContent).toBe("");
  });

  test("showAllErrors flags all invalid fields properly", () => {
    const form = setupForm();
    initValidation(form);
    showAllErrors(form);
    expect(
      form
        .querySelector<HTMLInputElement>("#name")!
        .getAttribute("aria-invalid"),
    ).toBe("true");
  });
});
