import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Button,
  Card,
  Input,
  TextArea,
  Select,
  Badge,
  LoadingSpinner,
  ErrorBanner,
  ConfirmDialog,
  ReminderModal,
  Avatar,
  EmptyState,
} from "../shared";

describe("§8.2 Button", () => {
  it("renders with primary variant by default", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("bg-accent-purple");
  });

  it("shows spinner and aria-busy when loading", () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
  });

  it("supports ghost and danger variants", () => {
    const { rerender } = render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-transparent", "text-text-secondary");

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-accent-red");
  });

  it("supports sm size", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: /small/i })).toHaveClass("py-1.5", "px-3");
  });

  it("supports lg size", () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button", { name: /large/i })).toHaveClass("py-3", "px-6");
  });
});

describe("§8.4 Card", () => {
  it("renders with base styles", () => {
    render(<Card>Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bg-bg-card", "rounded-xl", "border");
  });

  it("supports header and footer", () => {
    render(
      <Card header="Header" footer="Footer">
        Body
      </Card>,
    );
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("applies hoverable, selected, blocked variants", () => {
    const { rerender } = render(<Card hoverable>Hover</Card>);
    expect(screen.getByTestId("card")).toHaveClass("cursor-pointer");

    rerender(<Card selected>Sel</Card>);
    expect(screen.getByTestId("card")).toHaveClass("border-accent-purple");

    rerender(<Card blocked>Block</Card>);
    expect(screen.getByTestId("card")).toHaveClass("border-accent-red/50", "opacity-75");
  });
});

describe("§8 Input", () => {
  it("renders with label and error", () => {
    render(<Input label="Email" error="Invalid" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid");
  });
});

describe("§8 TextArea", () => {
  it("renders with label", () => {
    render(<TextArea label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });
});

describe("§8 Select", () => {
  it("renders options", () => {
    render(
      <Select
        label="Choose"
        options={[
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
        ]}
      />,
    );
    expect(screen.getByLabelText("Choose")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option A" })).toBeInTheDocument();
  });
});

describe("§8.3 Badge", () => {
  it("renders safety-pass variant with icon", () => {
    render(<Badge variant="safety-pass">Safety Passed</Badge>);
    const badge = screen.getByText("Safety Passed");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("span")).toHaveClass("bg-safety-pass/15", "text-safety-pass");
  });

  it("renders all variants", () => {
    const variants = [
      "safety-pass",
      "safety-fail",
      "safety-warn",
      "status-blocked",
      "status-approved",
      "ai",
    ] as const;
    variants.forEach((v) => {
      const { unmount } = render(<Badge variant={v}>{v}</Badge>);
      expect(screen.getByText(v)).toBeInTheDocument();
      unmount();
    });
  });
});

describe("§8 LoadingSpinner", () => {
  it("renders inline by default", () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole("status", { name: /loading/i });
    expect(spinner).toBeInTheDocument();
  });

  it("renders fullPage overlay when fullPage", () => {
    render(<LoadingSpinner fullPage />);
    const container = document.querySelector(".fixed.inset-0");
    expect(container).toBeInTheDocument();
  });
});

describe("§8 ErrorBanner", () => {
  it("renders message and dismiss button", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorBanner message="Something went wrong" onDismiss={onDismiss} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("§8.5 ConfirmDialog", () => {
  it("renders when open with title and body", () => {
    render(
      <ConfirmDialog
        open
        title="Confirm"
        body="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("calls onCancel when cancel clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Confirm"
        body="Body"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("has role=dialog and aria-modal", () => {
    render(
      <ConfirmDialog
        open
        title="Confirm"
        body="Body"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});

describe("§8 ReminderModal", () => {
  it("renders time picker when open", () => {
    render(
      <ReminderModal
        open
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/reminder time/i)).toBeInTheDocument();
  });
});

describe("§8 Avatar", () => {
  it("shows fallback initial when no src", () => {
    render(<Avatar fallback="John Doe" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });
});

describe("§8 EmptyState", () => {
  it("renders title and optional description", () => {
    render(
      <EmptyState
        title="No items"
        description="Add your first item to get started."
      />,
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started.")).toBeInTheDocument();
  });
});
