import { describe, it, expect } from "vitest";
import { migrate, parseResumeJSON } from "~/utils/storage";
import { EMPTY_RESUME } from "~/data/resume";

// ============================================================================
// migrate — null / non-object inputs
// ============================================================================
describe("migrate — null / non-object inputs", () => {
  it("returns EMPTY_RESUME for null input", () => {
    const result = migrate(null);
    expect(result).toBe(EMPTY_RESUME);
    expect(result.version).toBe("2.0.0");
    expect(result.header.contacts).toEqual([]);
    expect(result.sections).toEqual([]);
  });

  it("returns EMPTY_RESUME for string input", () => {
    const result = migrate("nonsense");
    expect(result).toBe(EMPTY_RESUME);
  });

  it("returns EMPTY_RESUME for number input", () => {
    const result = migrate(42);
    expect(result).toBe(EMPTY_RESUME);
  });
});

// ============================================================================
// migrate — v1 header conversion
// ============================================================================
describe("migrate — v1 header to contacts array", () => {
  it("converts v1 flat header fields to contacts[] with correct types", () => {
    const v1 = {
      header: {
        name: "Jane Doe",
        title: "Engineer",
        email: "jane@example.com",
        phone: "+852 1234 5678",
        website: "https://jane.dev",
        linkedin: "https://linkedin.com/in/jane",
        location: "Hong Kong",
      },
      sections: [],
    };
    const result = migrate(v1);
    expect(result.header.name).toBe("Jane Doe");
    const contacts = result.header.contacts;
    const email = contacts.find((c) => c.type === "email");
    const tel = contacts.find((c) => c.type === "tel");
    const location = contacts.find((c) => c.type === "string");
    const urls = contacts.filter((c) => c.type === "url");

    expect(email).toBeDefined();
    expect(email!.label).toBe("jane@example.com");
    expect(email!.href).toBe("mailto:jane@example.com");

    expect(tel).toBeDefined();
    expect(tel!.label).toBe("+852 1234 5678");
    expect(tel!.href).toBe("tel:+85212345678");

    expect(location).toBeDefined();
    expect(location!.label).toBe("Hong Kong");

    // website + linkedin both become url type
    expect(urls.length).toBe(2);
  });

  it("does not produce an email contact when v1 email is absent", () => {
    const v1 = {
      header: { name: "A", title: "B" },
      sections: [],
    };
    const result = migrate(v1);
    expect(result.header.contacts.length).toBe(0);
  });
});

// ============================================================================
// migrate — label prefix repair
// ============================================================================
describe("migrate — label prefix repair", () => {
  it("strips mailto: prefix from email contact label", () => {
    const broken = {
      header: {
        name: "X",
        title: "Y",
        contacts: [
          {
            id: "c1",
            type: "email",
            label: "mailto:me@example.com",
            href: "mailto:me@example.com",
          },
        ],
      },
      sections: [],
    };
    const result = migrate(broken);
    const emailContact = result.header.contacts.find((c) => c.type === "email");
    expect(emailContact!.label).toBe("me@example.com");
  });

  it("strips tel: prefix from tel contact label", () => {
    const broken = {
      header: {
        name: "X",
        title: "Y",
        contacts: [
          {
            id: "c2",
            type: "tel",
            label: "tel:+85262005806",
            href: "tel:+85262005806",
          },
        ],
      },
      sections: [],
    };
    const result = migrate(broken);
    const telContact = result.header.contacts.find((c) => c.type === "tel");
    expect(telContact!.label).toBe("+85262005806");
  });
});

// ============================================================================
// migrate — date conversion
// ============================================================================
describe("migrate — experience date conversion", () => {
  it('converts "MM/YYYY" start dates to "YYYY-MM"', () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "experience",
          title: "Experience",
          visible: true,
          data: {
            items: [
              {
                id: "e1",
                title: "Dev",
                company: "Acme",
                location: "",
                start: "03/2021",
                end: "Present",
                description: "",
              },
            ],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "experience") {
      const item = section.data.items[0];
      expect(item.start).toBe("2021-03");
      expect(item.end).toBe("");
    } else {
      throw new Error("expected experience section");
    }
  });

  it('converts "Present" end date to empty string', () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "experience",
          title: "Experience",
          visible: true,
          data: {
            items: [
              {
                id: "e1",
                title: "Dev",
                company: "Acme",
                location: "",
                start: "2020-01",
                end: "Present",
                description: "",
              },
            ],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "experience") {
      expect(section.data.items[0].end).toBe("");
    } else {
      throw new Error("expected experience section");
    }
  });
});

// ============================================================================
// migrate — bullets → description conversion
// ============================================================================
describe("migrate — bullets to description", () => {
  it("converts bullets[] to a <ul> in description when description is empty", () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "experience",
          title: "Experience",
          visible: true,
          data: {
            items: [
              {
                id: "e1",
                title: "Dev",
                company: "Acme",
                location: "",
                start: "2020-01",
                end: "",
                description: "",
                bullets: ["a", "b"],
              },
            ],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "experience") {
      const item = section.data.items[0];
      expect(item.description).toContain("<ul>");
      expect(item.description).toContain("<li>a</li>");
      expect(item.description).toContain("<li>b</li>");
      // bullets key should be gone
      expect((item as any).bullets).toBeUndefined();
    } else {
      throw new Error("expected experience section");
    }
  });

  it("does not add a second <ul> if description already contains one", () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "experience",
          title: "Experience",
          visible: true,
          data: {
            items: [
              {
                id: "e1",
                title: "Dev",
                company: "Acme",
                location: "",
                start: "2020-01",
                end: "",
                description: "<ul><li>existing</li></ul>",
                bullets: ["extra"],
              },
            ],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "experience") {
      const desc = section.data.items[0].description;
      const ulCount = (desc.match(/<ul/g) ?? []).length;
      expect(ulCount).toBe(1);
    } else {
      throw new Error("expected experience section");
    }
  });
});

// ============================================================================
// migrate — language level normalization
// ============================================================================
describe("migrate — language level normalization", () => {
  it('normalizes "fluent" to "Native"', () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "languages",
          title: "Languages",
          visible: true,
          data: {
            items: [{ id: "l1", name: "English", level: "fluent" }],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "languages") {
      expect(section.data.items[0].level).toBe("Native");
    } else {
      throw new Error("expected languages section");
    }
  });

  it('normalizes an unknown level to "Intermediate"', () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "languages",
          title: "Languages",
          visible: true,
          data: {
            items: [{ id: "l1", name: "Spanish", level: "unknown-xyz" }],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "languages") {
      expect(section.data.items[0].level).toBe("Intermediate");
    } else {
      throw new Error("expected languages section");
    }
  });

  it("passes through a valid existing level unchanged", () => {
    const resume = {
      header: { name: "", title: "", contacts: [] },
      sections: [
        {
          id: "s1",
          type: "languages",
          title: "Languages",
          visible: true,
          data: {
            items: [{ id: "l1", name: "French", level: "Advanced" }],
          },
        },
      ],
    };
    const result = migrate(resume);
    const section = result.sections[0];
    if (section.type === "languages") {
      expect(section.data.items[0].level).toBe("Advanced");
    } else {
      throw new Error("expected languages section");
    }
  });
});

// ============================================================================
// migrate — version stamp
// ============================================================================
describe("migrate — version stamp", () => {
  it('sets version to "2.0.0" on migrated output', () => {
    const result = migrate({ header: { name: "", title: "", contacts: [] }, sections: [] });
    expect(result.version).toBe("2.0.0");
  });
});

// ============================================================================
// parseResumeJSON
// ============================================================================
describe("parseResumeJSON", () => {
  it("throws for invalid JSON text", () => {
    expect(() => parseResumeJSON("not json")).toThrow();
  });

  it("throws when JSON is valid but missing header and sections", () => {
    expect(() => parseResumeJSON('{"foo":1}')).toThrow();
  });

  it("throws when header is present but sections is missing", () => {
    expect(() =>
      parseResumeJSON('{"header":{"name":"X","title":"","contacts":[]}}'),
    ).toThrow();
  });

  it("returns a migrated object with version 2.0.0 for a valid minimal resume", () => {
    const minimal = JSON.stringify({
      header: { name: "Alice", title: "Dev", contacts: [] },
      sections: [],
    });
    const result = parseResumeJSON(minimal);
    expect(result.version).toBe("2.0.0");
    expect(result.header.name).toBe("Alice");
    expect(result.sections).toEqual([]);
  });
});
