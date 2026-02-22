import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { AppRoutes } from "../routes";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";

// Mock auth and ui stores
vi.mock("../stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
  supabase: { auth: {} },
}));

const authStoreMock = useAuthStore as unknown as ReturnType<typeof vi.fn>;

const defaultAuthState = {
  user: null,
  isAuthenticated: false,
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
};

describe("§7.1 Route definitions", () => {
  beforeEach(() => {
    authStoreMock.mockImplementation((selector?: (s: unknown) => unknown) => {
      const state = defaultAuthState;
      return typeof selector === "function" ? selector(state) : state;
    });
  });

  it("renders LandingPage at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PharmaSense/i)).toBeInTheDocument();
  });

  it("renders LoginPage at /login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("redirects unknown routes to /", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByText(/PharmaSense/i)).toBeInTheDocument();
  });
});

function mockAuthStore(overrides: { user?: { email: string; role: string; userId: string } | null }) {
  const state = {
    user: overrides.user ?? null,
    signOut: vi.fn(),
  };
  authStoreMock.mockImplementation((selector?: (s: unknown) => unknown) =>
    typeof selector === "function" ? selector(state) : state,
  );
}

describe("§7.3 Navbar", () => {
  beforeEach(() => {
    mockAuthStore({ user: null });
  });

  it("has aria-label Main navigation", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it("shows Sign In when logged out", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows Overview, Features, Workflow, Impact when logged out", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText(/overview/i)).toBeInTheDocument();
    expect(screen.getByText(/features/i)).toBeInTheDocument();
    expect(screen.getByText(/workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/impact/i)).toBeInTheDocument();
  });

  it("shows patient nav when user is patient", () => {
    mockAuthStore({
      user: { email: "p@test.com", role: "patient", userId: "u1" },
    });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText(/my profile/i)).toBeInTheDocument();
    expect(screen.getByText(/my prescriptions/i)).toBeInTheDocument();
    expect(screen.getByText(/my visits/i)).toBeInTheDocument();
  });

  it("shows clinician nav when user is clinician", () => {
    mockAuthStore({
      user: { email: "c@test.com", role: "clinician", userId: "u1" },
    });
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/new visit/i)).toBeInTheDocument();
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
  });

  it("logo links to /", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    const logo = screen.getByRole("link", { name: /pharmasense/i });
    expect(logo).toHaveAttribute("href", "/");
  });
});

describe("§7.4 Sidebar", () => {
  beforeEach(() => {
    mockAuthStore({ user: null });
    useUiStore.setState({ sidebarOpen: false });
  });

  it("is hidden when sidebarOpen is false", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows drawer when sidebarOpen is true", () => {
    useUiStore.setState({ sidebarOpen: true });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole("dialog", { name: /close navigation/i });
    expect(dialog).toBeInTheDocument();
  });

  it("has close button with aria-label Close navigation", () => {
    useUiStore.setState({ sidebarOpen: true });
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    const closeBtn = screen.getByRole("button", { name: /close navigation/i });
    expect(closeBtn).toBeInTheDocument();
  });
});
