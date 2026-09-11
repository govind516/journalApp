import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Onboarding from "@/components/Onboarding";

describe("Onboarding", () => {
  it("skips from the first screen without stepping through", async () => {
    const user = userEvent.setup();
    render(<Onboarding />);
    expect(await screen.findByTestId("onboarding-dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("onboarding-skip-button"));
    await waitFor(() => expect(screen.queryByTestId("onboarding-dialog")).not.toBeInTheDocument());
    expect(window.localStorage.getItem("journal-onboarded")).toBe("1");
  });

  it("stays dismissed on revisit", async () => {
    window.localStorage.setItem("journal-onboarded", "1");
    render(<Onboarding />);
    expect(screen.queryByTestId("onboarding-dialog")).not.toBeInTheDocument();
  });
});
