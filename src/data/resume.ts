// ============================================================================
// Resume Schema
// ----------------------------------------------------------------------------
// This file is the canonical source of truth for the resume JSON format.
// Every section in the editor maps to one variant of `ResumeSection.data`.
// Add a new section type by:
//   1. Adding it to `SectionType`
//   2. Adding a payload interface
//   3. Discriminating it in `ResumeSection`
//   4. Adding a default factory in `createEmptySection()`
//   5. Rendering it in `<ResumePreview>` and `<SectionEditor>`
// ============================================================================

export type SectionType =
  | "summary"
  | "languages"
  | "skills"
  | "expertise"
  | "experience"
  | "education"
  | "certifications"
  | "awards"
  | "references";

export interface Header {
  name: string;
  title: string;
  email: string;     // rendered as a mailto: link
  phone: string;     // rendered as a tel: link
  website: string;   // rendered as an https:// link
  linkedin: string;  // rendered as an https:// link
  location: string;  // plain text
}

export interface SummaryData {
  text: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;       // human label e.g. "Native", "Advanced"
  proficiency: number; // 0..5 — drives the dot indicator
}

export interface LanguagesData {
  items: LanguageItem[];
}

export interface SkillGroup {
  id: string;
  label: string;       // "Programming languages", "Frameworks", ...
  skills: string[];    // free-text list of chips
}

export interface SkillsData {
  groups: SkillGroup[];
}

export interface ExpertiseItem {
  id: string;
  label: string;
  level: number;       // 0..100 — drives the bar fill
}

export interface ExpertiseData {
  items: ExpertiseItem[];
}

export interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  location: string;
  start: string;       // free-text date — e.g. "11/2019", "Present"
  end: string;
  /**
   * Rich-text (HTML) describing the role. TinyMCE produces this and the
   * preview renders it via dangerouslySetInnerHTML. Bullet points live here
   * as `<ul><li>…</li></ul>` — no separate field needed.
   */
  description: string;
  /**
   * @deprecated Legacy field from the v1.0 schema where bullets were a
   * separate string[]. Newly-created items always have `[]`; older saved data
   * gets migrated into `description` as an inline list by storage.ts. Kept on
   * the type so older JSON imports still parse cleanly.
   */
  bullets: string[];
}

export interface ExperienceData {
  items: ExperienceItem[];
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  start: string;
  end: string;
}

export interface EducationData {
  items: EducationItem[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
}

export interface CertificationsData {
  items: CertificationItem[];
}

export interface AwardItem {
  id: string;
  name: string;
  description: string;
}

export interface AwardsData {
  items: AwardItem[];
}

export interface ReferenceItem {
  id: string;
  name: string;
  role: string;
  contact: string;
}

export interface ReferencesData {
  items: ReferenceItem[];
}

// Discriminated union — keeps editor + preview in lock-step with type safety
export type ResumeSection =
  | { id: string; type: "summary"; title: string; visible: boolean; data: SummaryData }
  | { id: string; type: "languages"; title: string; visible: boolean; data: LanguagesData }
  | { id: string; type: "skills"; title: string; visible: boolean; data: SkillsData }
  | { id: string; type: "expertise"; title: string; visible: boolean; data: ExpertiseData }
  | { id: string; type: "experience"; title: string; visible: boolean; data: ExperienceData }
  | { id: string; type: "education"; title: string; visible: boolean; data: EducationData }
  | { id: string; type: "certifications"; title: string; visible: boolean; data: CertificationsData }
  | { id: string; type: "awards"; title: string; visible: boolean; data: AwardsData }
  | { id: string; type: "references"; title: string; visible: boolean; data: ReferencesData };

export interface Resume {
  version: string;
  header: Header;
  sections: ResumeSection[];
  // Optional theming so users can re-skin without forking the code
  theme?: {
    accent: string;     // hex — drives section headings, chips, bars
    text: string;       // hex — body copy
    paper: string;      // hex — page background
  };
}

// Tiny id helper — short enough to keep JSON readable
export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Default resume — Isaac's data, extracted from the supplied PDF.
// Kept here (rather than in the component) so a brand-new user gets a
// useful example *and* the editor has something meaningful to render
// before any localStorage is set.
// ============================================================================

export const DEFAULT_RESUME: Resume = {
  version: "1.0.0",
  header: {
    name: "ISAAC NG, KA HO",
    title:
      "Senior Software Engineer | Web & App Development Technical Leadership | Project Management | Efficient Problem Solving",
    email: "me@isaac.ng",
    phone: "",
    website: "https://isaac.ng",
    linkedin: "https://www.linkedin.com/in/isaac-ng-573851159/",
    location: "Hong Kong",
  },
  theme: {
    accent: "#E67E22",
    text: "#1F3A5F",
    paper: "#ffffff",
  },
  sections: [
    {
      id: uid("sec"),
      type: "summary",
      title: "Summary",
      visible: true,
      data: {
        text:
          "Software Engineer with 9+ years of experience designing and delivering innovative software solutions across diverse industries. Proven expertise in leading development teams, driving SaaS product development, and managing multiple projects simultaneously. Skilled in optimizing performance, enhancing efficiency, and solving complex problems through advanced programming, system architecture design, and effective collaboration.",
      },
    },
    {
      id: uid("sec"),
      type: "languages",
      title: "Languages",
      visible: true,
      data: {
        items: [
          { id: uid("lang"), name: "Cantonese", level: "Native", proficiency: 5 },
          { id: uid("lang"), name: "Mandarin", level: "Proficient", proficiency: 4 },
          { id: uid("lang"), name: "English", level: "Advanced", proficiency: 3 },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "skills",
      title: "Skills & Knowledges",
      visible: true,
      data: {
        groups: [
          {
            id: uid("grp"),
            label: "Programming languages",
            skills: ["JavaScript", "TypeScript", "Golang", "Python", "Java", "PHP", "Objective C"],
          },
          {
            id: uid("grp"),
            label: "Frameworks",
            skills: [
              "jQuery", "Electron", "React", "React Native", "Expo", "Nest.js",
              "Gatsby.js", "Angular 4", "Vue.js", "Taro", "CakePHP", "Laravel",
              "Drupal", "WordPress", "Express.js", "NestJs", "Tailwind.css",
              "MUI", "Ionic", "Shadcn", "GORM",
            ],
          },
          {
            id: uid("grp"),
            label: "Databases",
            skills: ["MySQL", "PostgreSQL", "DynamoDB", "MongoDB", "Timescale DB", "Redis"],
          },
          {
            id: uid("grp"),
            label: "Knowledge",
            skills: [
              "HTML", "CSS", "Git", "GitHub", "GitHub CI/CD", "GitLab", "GitLab CI/CD",
              "Monorepo", "Micro Frontend", "Turbo repo", "Web Component", "Postman",
              "Figma", "Design System", "Storybook", "Docker", "Camunda", "Airflow",
              "Streamlit", "n8n", "windmill.dev", "sanity.io", "Netlify", "RabbitMQ",
              "Sentry", "Datadog", "KeyCloak", "Restful", "GraphQL", "Kong", "Linux",
              "Apache", "Nginx", "MinIO", "WeChat APIs", "Facebook Messager APIs",
              "AWS", "GCP", "Spec-Driven Development", "Test-Driven Development",
              "Agentic AI", "Compounding Engineering", "Context Engineering",
            ],
          },
          {
            id: uid("grp"),
            label: "Software",
            skills: [
              "MS Office", "TablePlus", "DBeaver", "MongoDB Compass", "XCode",
              "Android Studio", "VSCode", "AnyDesk", "JetBrains IDEs", "Docker Desktop",
              "1Password", "Ollama", "Amazon Q", "Claude Code", "Gemini", "Open Code",
            ],
          },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "expertise",
      title: "Industry Expertise",
      visible: true,
      data: {
        items: [
          { id: uid("exp"), label: "Leadership", level: 75 },
          { id: uid("exp"), label: "Project Management", level: 78 },
          { id: uid("exp"), label: "Problem Solving", level: 88 },
          { id: uid("exp"), label: "Communication", level: 55 },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "experience",
      title: "Experience",
      visible: true,
      data: {
        items: [
          {
            id: uid("xp"),
            title: "Senior Web Developer",
            company: "The Executive Centre",
            location: "Wong Chuk Hang, Hong Kong",
            start: "Present",
            end: "",
            description: "<p>The Executive Centre (TEC) is a premium flexible workspace provider, opened its doors in Hong Kong in 1994 and has over 240+ Centres in 37 cities and 15 markets.</p><ul><li>Consistent maintenance and timely updates.</li><li>Boosted development efficiency through integrating AI workflows into the process.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Principal Software Engineer",
            company: "Varadise Limited",
            location: "Kwun Tong, Hong Kong",
            start: "04/2025",
            end: "07/2025",
            description: "<p>Varadise is a Hong Kong-based AI technology company, founded in 2019, specializing in digital twin solutions and smart construction management. Its <a href=\"https://www.varadise.com/cosmos\" target=\"_blank\" rel=\"noopener noreferrer\">COSMOS</a> platform integrates AI, IoT, and BIM data to enhance project efficiency, safety, and compliance in the construction and smart city sectors.</p><ul><li>Established <a href=\"https://www.varadise.com/cosmos\" target=\"_blank\" rel=\"noopener noreferrer\">COSMOS</a> cross-platform (React &amp; React Native) design system, defining monorepo structure, creating CLI tools for code generation, researching styling solutions, standardizing UI components with documentation, and configuring Storybook and package build pipeline.</li><li>Refactored <a href=\"https://www.varadise.com/cosmos\" target=\"_blank\" rel=\"noopener noreferrer\">COSMOS</a> status-flow pages and workflow backend solo in 1.5 months, implementing conditional actions for form submissions, background deadline countdown, and notifications.</li><li>Developed CLI tools for mobile app builds, enabling customization of app icon, name, and environment, and supporting future CI/CD pipeline automation.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Technical Leader (Product Frontend)",
            company: "Varadise Limited",
            location: "",
            start: "05/2024",
            end: "04/2025",
            description: "<ul><li>Collaborated on <a href=\"https://www.varadise.com/cosmos\" target=\"_blank\" rel=\"noopener noreferrer\">COSMOS</a> micro-frontend architecture, defining monorepo structure, creating CLI tools for code generation, and setting up Storybook and web-based design system.</li><li>Independently developed a microservices-based workflow and form system prototype for <a href=\"https://www.varadise.com/cosmos\" target=\"_blank\" rel=\"noopener noreferrer\">COSMOS</a> in 1.5 months.</li><li>Conducted code reviews, task distribution, and standardized coding practices with documented guides for team and contributors.</li><li>Contributed to Scrum sprints with task time estimates and provided technical advice to product manager to optimize company objectives.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Senior Web Developer",
            company: "Varadise Limited",
            location: "",
            start: "03/2023",
            end: "05/2024",
            description: "<ul><li>Built a generic form rendering library and collaborated on a form-workflow backend for DWSS v3, simplifying form creation.</li><li>Solo-developed DWSS v2 frontend in 3 months with global state management and standardized UI, enhancing UX and consistency.</li><li>Created ETL process and automated government report submissions using Airflow for DWSS v2.</li><li>Dockerized DWSS v2 microservice with Docker Compose, streamlining testing and debugging.</li><li>Built CLI tool for legacy DWSS v1, reducing manual data processing time by 80%.</li><li>Improved team processes by standardizing tickets and mentoring junior developers through code reviews and task distribution.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Senior Software Engineer",
            company: "Spaceship HK",
            location: "Sha Tin, Hong Kong",
            start: "11/2019",
            end: "07/2022",
            description: "<p>Spaceship, Hong Kong-based logistics platform, simplifies e-commerce shipping. Spaceship Pro offers discounted UPS, FedEx, DHL rates for door-to-door delivery in 200+ regions. Tech streamlines order management, tracking, customs, inventory, optimizing operations and cutting costs.</p><ul><li>Enhanced Spaceship's SEO by transitioning from CSR to SSR and optimized APIs by migrating to NestJS for improved efficiency and scalability.</li><li>Collaborated on reusable frontend design system for consistent UI across projects and built a top-ranked cross-platform SaaS app in two months, boosting revenue.</li><li>Migrated company's WordPress site to Gatsby.js with Sanity CMS, improving LCP, SEO, and search visibility via Nginx redirects.</li><li>Led internal tutorials, mentored interns and junior developers, and supported feature development and bug fixing to enhance team collaboration.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Web Application Developer",
            company: "WeMine",
            location: "Kwun Tong, Hong Kong",
            start: "01/2018",
            end: "10/2019",
            description: "<p>WeMine, founded in 2014, offers chat-based marketing solutions on WeChat, WhatsApp, and Facebook Messenger. Specializing in digital marketing and automation, including the WM:Suite platform, WeMine enhances brand engagement with data-driven strategies and content personalization.</p><ul><li>Revamped <a href=\"https://www.wemine.tech/intelligence\" target=\"_blank\" rel=\"noopener noreferrer\">Intelligence</a> frontend, adding analytics and optimizing performance for enhanced user experience and efficiency.</li><li>Architected standardized API connectors for <a href=\"https://www.wemine.tech/activate\" target=\"_blank\" rel=\"noopener noreferrer\">Activate</a>, enabling seamless WeChat and Facebook Messenger integration.</li><li>Modernized <a href=\"https://www.wemine.tech/engage\" target=\"_blank\" rel=\"noopener noreferrer\">Engage</a>'s legacy frontend with React 16 for a responsive, scalable UI.</li><li>Built WeChat and Facebook Messenger mini programs and campaign sites, boosting client engagement.</li><li>Integrated core product features with campaign mini programs for cohesive, high-impact digital experiences.</li></ul>",
            bullets: [],
          },
          {
            id: uid("xp"),
            title: "Web Development Intern",
            company: "Web-gineer",
            location: "Lai Chi Kok, Hong Kong",
            start: "05/2016",
            end: "12/2017",
            description: "<p>Webgineer Limited, a Hong Kong agency since 2012, excels in execution and development. We prioritize clarity, aesthetics, and functionality through research and testing, delivering client-focused solutions.</p>",
            bullets: [],
          },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "education",
      title: "Education",
      visible: true,
      data: {
        items: [
          {
            id: uid("edu"),
            degree: "Bachelor of Engineering - BE, Computer Science",
            school: "The Hong Kong University of Science and Technology",
            start: "01/2014",
            end: "12/2018",
          },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "certifications",
      title: "Licenses & Certifications",
      visible: true,
      data: {
        items: [
          { id: uid("crt"), name: "Cloud-Based Lightweight Optimization for WordPress", issuer: "Udemy" },
          { id: uid("crt"), name: "Gemini Certified Educator", issuer: "Google for Education" },
          { id: uid("crt"), name: "Software Engineer", issuer: "HackerRank" },
          { id: uid("crt"), name: "Frontend Developer (React)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Problem Solving (Intermediate)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Rest API (Intermediate)", issuer: "HackerRank" },
          { id: uid("crt"), name: "SQL (Advanced)", issuer: "HackerRank" },
          { id: uid("crt"), name: "React (Basic)", issuer: "HackerRank" },
          { id: uid("crt"), name: "JavaScript (Intermediate)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Node.js (Intermediate)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Go (Intermediate)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Python (Basic)", issuer: "HackerRank" },
          { id: uid("crt"), name: "Java (Basic)", issuer: "HackerRank" },
          { id: uid("crt"), name: "IIQE Paper I", issuer: "Vocational Training Council" },
          { id: uid("crt"), name: "IIQE Paper III", issuer: "Vocational Training Council" },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "awards",
      title: "Honors & Awards",
      visible: true,
      data: {
        items: [
          {
            id: uid("awd"),
            name: "Cyberport Creative Micro Fund (CCMF) Grantee",
            description:
              "\"WhatsHulb,\" a fair platform empowering everyone to participate in co-creations and bring creative visions to life, secured HK$100,000 in seed funding from the Cyberport Creative Micro Fund in 2017 to kick-start its innovative idea and develop prototypes.",
          },
          {
            id: uid("awd"),
            name: "JUPAS Scholarships",
            description:
              "HKUST provides a wide variety of scholarships for students who demonstrate exceptional academic accomplishment.",
          },
        ],
      },
    },
    {
      id: uid("sec"),
      type: "references",
      title: "References",
      visible: true,
      data: {
        items: [
          { id: uid("ref"), name: "Tom Tong", role: "Chief Technology Officer @Varadise Limited", contact: "(+852) 6200-5806" },
          { id: uid("ref"), name: "Chi Lam", role: "Co-Founder & CEO @Spaceship HK", contact: "(+852) 6028-6962" },
        ],
      },
    },
  ],
};

// Factories so the "Add section" UI can spawn empty templates safely
export function createEmptySection(type: SectionType): ResumeSection {
  const id = uid("sec");
  switch (type) {
    case "summary":
      return { id, type, title: "Summary", visible: true, data: { text: "" } };
    case "languages":
      return { id, type, title: "Languages", visible: true, data: { items: [] } };
    case "skills":
      return { id, type, title: "Skills & Knowledges", visible: true, data: { groups: [] } };
    case "expertise":
      return { id, type, title: "Industry Expertise", visible: true, data: { items: [] } };
    case "experience":
      return { id, type, title: "Experience", visible: true, data: { items: [] } };
    case "education":
      return { id, type, title: "Education", visible: true, data: { items: [] } };
    case "certifications":
      return { id, type, title: "Licenses & Certifications", visible: true, data: { items: [] } };
    case "awards":
      return { id, type, title: "Honors & Awards", visible: true, data: { items: [] } };
    case "references":
      return { id, type, title: "References", visible: true, data: { items: [] } };
  }
}
