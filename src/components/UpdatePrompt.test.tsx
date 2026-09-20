import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUpdate } from "../lib/updates";

const updateMocks = vi.hoisted(() => ({
  check: vi.fn(),
  install: vi.fn(),
}));

vi.mock("../lib/updates", () => ({
  checkForAppUpdate: updateMocks.check,
  installAppUpdate: updateMocks.install,
}));

import { UpdatePrompt } from "./UpdatePrompt";

function availableUpdate() {
  return {
    version: "0.2.0",
    currentVersion: "0.1.0",
    body: "A more polished wardrobe.",
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as AppUpdate;
}

describe("UpdatePrompt", () => {
  beforeEach(() => {
    updateMocks.check.mockReset();
    updateMocks.install.mockReset();
  });

  afterEach(cleanup);

  it("stays out of the way when the startup check fails", async () => {
    updateMocks.check.mockRejectedValue(new Error("offline"));
    render(<UpdatePrompt />);
    await waitFor(() => expect(updateMocks.check).toHaveBeenCalledOnce());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets the user postpone an available update", async () => {
    const update = availableUpdate();
    updateMocks.check.mockResolvedValue(update);
    render(<UpdatePrompt />);

    expect(
      await screen.findByRole("dialog", { name: "WorDrop 0.2.0 is ready" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(update.close).toHaveBeenCalledOnce();
  });

  it("downloads an accepted update and reports progress", async () => {
    const update = availableUpdate();
    updateMocks.check.mockResolvedValue(update);
    updateMocks.install.mockImplementation(
      async (_update: AppUpdate, onEvent: (event: unknown) => void) => {
        onEvent({ event: "Started", data: { contentLength: 100 } });
        onEvent({ event: "Progress", data: { chunkLength: 40 } });
        await new Promise(() => undefined);
      },
    );
    render(<UpdatePrompt />);

    await screen.findByRole("dialog");
    await userEvent.click(
      screen.getByRole("button", { name: "Download and install" }),
    );

    expect(await screen.findByText("40%")).toBeInTheDocument();
    expect(updateMocks.install).toHaveBeenCalledWith(
      update,
      expect.any(Function),
    );
    expect(screen.getByRole("button", { name: "Not now" })).toBeDisabled();
  });
});
