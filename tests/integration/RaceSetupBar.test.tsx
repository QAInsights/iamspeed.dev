/** @jsxImportSource preact */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/preact";
import { RaceSetupBar } from "../../src/components/race/RaceSetupBar";

describe("RaceSetupBar", () => {
  afterEach(() => cleanup());

  it("renders prompt input with value", () => {
    const { container } = render(
      <RaceSetupBar prompt="hello" onPromptChange={() => {}} raceState="idle" onStart={() => {}} onStop={() => {}} canStart={true} />,
    );
    const input = container.querySelector(".race-prompt-input") as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  it("calls onPromptChange when typing", () => {
    const onPromptChange = vi.fn();
    const { container } = render(
      <RaceSetupBar prompt="" onPromptChange={onPromptChange} raceState="idle" onStart={() => {}} onStop={() => {}} canStart={true} />,
    );
    const input = container.querySelector(".race-prompt-input")!;
    fireEvent.input(input, { target: { value: "new prompt" } });
    expect(onPromptChange).toHaveBeenCalledWith("new prompt");
  });

  it("shows Start button when idle", () => {
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="idle" onStart={() => {}} onStop={() => {}} canStart={true} />,
    );
    const btn = container.querySelector(".race-btn-start")!;
    expect(btn.textContent).toBe("Start your engines");
  });

  it("shows Race Again when done", () => {
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="done" onStart={() => {}} onStop={() => {}} canStart={true} />,
    );
    const btn = container.querySelector(".race-btn-start")!;
    expect(btn.textContent).toBe("Race Again");
  });

  it("disables Start when canStart is false", () => {
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="idle" onStart={() => {}} onStop={() => {}} canStart={false} />,
    );
    const btn = container.querySelector(".race-btn-start") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("calls onStart when Start clicked", () => {
    const onStart = vi.fn();
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="idle" onStart={onStart} onStop={() => {}} canStart={true} />,
    );
    fireEvent.click(container.querySelector(".race-btn-start")!);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("shows Stop button when running", () => {
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="running" onStart={() => {}} onStop={() => {}} canStart={false} />,
    );
    expect(container.querySelector(".race-btn-stop")!).toBeTruthy();
    expect(container.querySelector(".race-btn-start")).toBeNull();
  });

  it("calls onStop when Stop clicked", () => {
    const onStop = vi.fn();
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="running" onStart={() => {}} onStop={onStop} canStart={false} />,
    );
    fireEvent.click(container.querySelector(".race-btn-stop")!);
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("disables prompt input when running", () => {
    const { container } = render(
      <RaceSetupBar prompt="hi" onPromptChange={() => {}} raceState="running" onStart={() => {}} onStop={() => {}} canStart={false} />,
    );
    const input = container.querySelector(".race-prompt-input") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
