# CPI Script Wizard - Front-end Architecture & Layout Specification

## 1. Overview
**CPI Script Wizard** is a Micro-SaaS designed for SAP Cloud Integration (CPI) developers. It leverages AI to generate Groovy scripts based on natural language prompts, reducing development time and ensuring best practices in integration logic.

## 2. Design Philosophy
- **Minimalism:** Zero clutter. Every element must serve a functional purpose.
- **Developer-Centric:** Deep dark mode inspired by VS Code to reduce eye strain and provide a familiar environment.
- **Efficiency:** Fast interactions, clear hierarchy, and immediate feedback.

## 3. Visual Identity (Color Palette)
| Element | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Main Background** | `#1E1E1E` | Primary workspace background |
| **Secondary Background** | `#252526` | Cards, panels, and input areas |
| **Primary Text** | `#D4D4D4` | High readability text |
| **Accent / Action** | `#007ACC` | Primary buttons, active states, focus rings |
| **Borders / Dividers** | `#3E3E42` | Subtle separation of UI components |

## 4. Component Architecture

### 4.1 Landing Page
- **Hero Section:**
  - Headline: "Groovy Scripts for SAP CPI, Powered by AI."
  - Sub-headline: "Generate production-ready integration logic in seconds. Minimalist. Precise. Built for developers."
  - CTA: "Start Generating" (Primary Action Button).
- **Footer:** Minimal links (Terms, Privacy, Support).

### 4.2 Main Dashboard (The 'IDE')
- **Header:**
  - Left: App Logo/Name.
  - Right: Credit Balance (e.g., "15 Credits Remaining") + "Recharge" button (Ghost style).
- **Split-Screen Layout:**
  - **Left Panel (Input):**
    - Large text area for natural language prompts.
    - "Generate Script" button at the bottom.
  - **Right Panel (Output):**
    - Code Editor container with syntax highlighting (Groovy).
    - "Copy to Clipboard" and "Download .groovy" actions.

## 5. Technical Implementation (Next.js + Tailwind)

### 5.1 Tailwind Configuration
Extend the `tailwind.config.js` to include the custom palette:
```javascript
theme: {
  extend: {
    colors: {
      'vscode-bg': '#1E1E1E',
      'vscode-panel': '#252526',
      'vscode-text': '#D4D4D4',
      'vscode-blue': '#007ACC',
      'vscode-border': '#3E3E42',
    }
  }
}
```

### 5.2 State Management
- **Prompt State:** Local state for the text input.
- **Generated Code State:** State to hold the AI response.
- **Loading State:** To manage the generation UI feedback.
- **User Session:** Managed via NextAuth.js or similar for credit tracking.

### 5.3 AI Integration
- Use `@google/genai` for server-side or client-side generation (depending on security needs).
- System Prompt: "You are an expert SAP CPI developer. Generate only valid Groovy scripts for SAP CPI Message Mapping or Script steps."

## 6. Layout Structure
```tsx
<main className="min-h-screen bg-vscode-bg text-vscode-text font-sans">
  <Header />
  <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
    <PromptSection className="w-full md:w-1/3 border-r border-vscode-border" />
    <EditorSection className="w-full md:w-2/3" />
  </div>
</main>
```
