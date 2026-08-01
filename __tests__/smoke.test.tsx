import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("smoke", () => {
  it("renders a shadcn Button via jsdom + RTL + @/ alias", () => {
    render(<Button>Hello template</Button>);
    expect(screen.getByRole("button", { name: "Hello template" })).toBeTruthy();
  });
});
