import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClassifierPanel } from "./ClassifierPanel";

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  download: vi.fn(),
  select: vi.fn(),
}));
vi.mock("../lib/images/classifierDownload", () => ({
  getClassifierStatus: mocks.status,
  downloadImaJev: mocks.download,
}));
vi.mock("../lib/settings", () => ({ setImageClassifier: mocks.select }));
const status = {
  ready: false,
  downloading: false,
  downloadedBytes: 0,
  totalBytes: 3e9,
  message: "",
};
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.status.mockResolvedValue(status);
});

it("defaults to FashionCLIP and makes no automatic download", async () => {
  render(
    <ClassifierPanel
      settings={{ allowMultipleBottoms: false, classifier: "fashionclip" }}
      onSettingsChange={vi.fn()}
    />,
  );
  expect(screen.getByRole("radio", { name: /FashionCLIP/ })).toBeChecked();
  expect(screen.getByRole("radio", { name: /ImaJev/ })).toBeDisabled();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /Download ImaJev/ }),
    ).toBeEnabled(),
  );
  expect(mocks.download).not.toHaveBeenCalled();
});
it("unlocks ImaJev after download and saves an explicit selection", async () => {
  mocks.download.mockResolvedValue({ ...status, ready: true });
  mocks.select.mockResolvedValue({
    allowMultipleBottoms: false,
    classifier: "imajev",
  });
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <ClassifierPanel
      settings={{ allowMultipleBottoms: false, classifier: "fashionclip" }}
      onSettingsChange={onChange}
    />,
  );
  const download = screen.getByRole("button", { name: /Download ImaJev/ });
  await waitFor(() => expect(download).toBeEnabled());
  await user.click(download);
  expect(mocks.download).toHaveBeenCalledOnce();
  expect(mocks.select).not.toHaveBeenCalled();
  await user.click(screen.getByRole("radio", { name: /ImaJev/ }));
  expect(mocks.select).toHaveBeenCalledWith("imajev");
  expect(onChange).toHaveBeenCalledWith({
    allowMultipleBottoms: false,
    classifier: "imajev",
  });
});
it("keeps selection locked after failure and permits retry", async () => {
  mocks.download.mockRejectedValue("Download failed. Retry.");
  const user = userEvent.setup();
  render(
    <ClassifierPanel
      settings={{ allowMultipleBottoms: false, classifier: "fashionclip" }}
      onSettingsChange={vi.fn()}
    />,
  );
  const download = screen.getByRole("button", { name: /Download ImaJev/ });
  await waitFor(() => expect(download).toBeEnabled());
  await user.click(download);
  expect(await screen.findByRole("alert")).toHaveTextContent("Download failed");
  expect(screen.getByRole("radio", { name: /ImaJev/ })).toBeDisabled();
  expect(download).toBeEnabled();
});
it("shows a native download already in progress after reopening settings", async () => {
  mocks.status.mockResolvedValue({
    ...status,
    downloading: true,
    downloadedBytes: 1e9,
    message: "Downloading model.onnx.data",
  });
  render(
    <ClassifierPanel
      settings={{ allowMultipleBottoms: false, classifier: "fashionclip" }}
      onSettingsChange={vi.fn()}
    />,
  );
  expect(await screen.findByRole("progressbar")).toHaveAttribute(
    "value",
    "1000000000",
  );
  expect(
    screen.getByRole("button", { name: /Downloading ImaJev/ }),
  ).toBeDisabled();
  expect(mocks.download).not.toHaveBeenCalled();
});
