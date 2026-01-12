# VANTIX-OMEGA AI-OS

**Next-Generation Distributed AI Operating System with Multi-Agent Architecture.**

**Version:** v1.0.0-RC1 (Gold Master)  
**Copyright:** © Rohit Choudhary  
**License:** Proprietary / Closed Source

---

## 🚀 Quick Start Guide

This system requires a modern Node.js environment and a valid Google Gemini API Key.

### 1. Prerequisites

*   **Node.js**: v18.0.0 or higher
*   **npm**: v9.0.0 or higher
*   **API Key**: A valid key from [Google AI Studio](https://aistudio.google.com/) with access to `gemini-2.0-flash` and `gemini-2.0-pro-exp`.

### 2. Installation

Clone the repository (if applicable) or navigate to the project root.

```bash
# Install dependencies
npm install
```

### 3. Configuration

Create a `.env` file in the root directory. You can copy the example:

```bash
cp .env.example .env
```

Edit `.env` and set your API key:

```env
API_KEY=your_actual_api_key_here
```

### 4. Running the System

Start the development server:

```bash
npm run dev
```

The system will boot up at `http://localhost:3000`.

*   **Initial Boot:** You should see the "VANTIX-OMEGA KERNEL BOOT SEQUENCE" in the system logs.
*   **Ownership Verification:** Check the browser console (F12) for the official copyright attestation.

### 5. Building for Production

To create an optimized production build:

```bash
npm run build
```

The artifacts will be generated in the `dist/` directory, ready for deployment to Vercel, Netlify, or AWS Amplify.

---

## 🛠 Verification Protocol

Refer to the internal **FINAL STARTUP-GRADE TESTING & VERIFICATION PROTOCOL** for detailed testing steps involving:

1.  **System Boot Test**: Verifying Kernel Integrity.
2.  **Agent Execution**: Testing the Think-Act-Observe loop.
3.  **Workflow Engine**: Validating automation and network capabilities.
4.  **Memory Vault**: Confirming ACID compliance and persistence.
5.  **Security Core**: Validating RBAC and permission blocking.

---

## ⚠️ Troubleshooting

*   **Error 429 (Quota Exceeded)**: The system utilizes `gemini-3-pro-preview` for complex reasoning. If this model is overloaded, the system effectively routes to `gemini-3-flash-preview` automatically. Check logs for "Fallback" messages.
*   **IndexedDB Errors**: If the Memory Vault fails to load, clear your browser's Application Storage for `vantix-omega-core` and reload to trigger a fresh filesystem mount.

---

**CONTACT**  
Rohit Choudhary  
rc8680118@gmail.com
