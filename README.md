# Hisaab

**Hisaab** is a modern personal finance management application designed to help users organize, track, and understand their finances from a single platform.

The application brings together expense tracking, account management, budgeting, bills, subscriptions, savings goals, financial reports, group expenses, and AI-powered insights in one centralized interface.

---

## Features

### Dashboard

* Financial overview in a centralized dashboard
* Transaction and account summaries
* Visual representation of financial activity
* Quick access to important financial information

### Expense & Transaction Management

* Record and manage income and expenses
* Organize financial transactions
* Track transaction history
* Monitor financial activity

### Account Management

* Manage multiple financial accounts
* View account-related information
* Keep financial accounts organized in one place

### Budget Management

* Create and manage budgets
* Monitor spending against planned budgets
* Track financial progress

### Bills & Subscriptions

* Manage recurring bills
* Track subscription expenses
* Organize upcoming financial obligations

### Savings Goals

* Create personal savings goals
* Track progress toward financial targets
* Monitor goal-related financial activity

### Groups

* Manage shared financial activities
* Organize group-related expenses

### Reports & Analytics

* Analyze financial activity
* View financial reports
* Understand spending patterns through visual insights

### AI Insights

* AI-powered financial insights
* Intelligent analysis of available financial information
* Dedicated AI functionality integrated into the application

### Authentication & User Management

* Firebase-based authentication
* User account management
* Profile and application settings

---

## Technology Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**

### Backend

* **Node.js**
* **TypeScript**

### Database & Services

* **Firebase Authentication**
* **Cloud Firestore**
* **Firebase Storage**

### AI

* **Google Gemini API**

### Development Tools

* **Git**
* **GitHub**
* **npm**
* **Bun**
* **VS Code**

---

## Project Structure

```text
Hisaab/
│
├── server/
│   ├── gemini.ts
│   └── routes.ts
│
├── src/
│   ├── components/
│   │   ├── accounts/
│   │   ├── admin/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── bills/
│   │   ├── budgets/
│   │   ├── dashboard/
│   │   ├── goals/
│   │   ├── groups/
│   │   ├── layout/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── subscriptions/
│   │   └── transactions/
│   │
│   ├── config/
│   │   └── firebase.ts
│   │
│   ├── context/
│   │   └── AuthContext.tsx
│   │
│   ├── lib/
│   │   └── utils.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   └── firestoreService.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── server.ts
├── firebase-blueprint.json
├── firestore.rules
├── storage.rules
├── package.json
├── package-lock.json
├── bun.lock
├── tsconfig.json
├── vite.config.ts
├── metadata.json
├── index.html
├── .env.example
├── .gitignore
└── README.md
```

---

## Prerequisites

Before running Hisaab locally, make sure the following are installed:

* Node.js
* npm
* Git

Bun can also be used as an alternative package manager.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Tanmay2109/Hisaab.git
```

Navigate to the project directory:

```bash
cd Hisaab
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Or using Bun:

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

```bash
cp .env.example .env
```

Add the required Firebase and AI configuration values to the `.env` file.

> **Important:** Never commit your `.env` file or expose private credentials, API keys, or secrets in the repository.

### 4. Start the Development Server

Using npm:

```bash
npm run dev
```

Or using Bun:

```bash
bun run dev
```

The development application will be available at the local URL provided by Vite.

---

## Firebase Configuration

Hisaab uses Firebase for authentication, database operations, and storage.

The project includes Firebase-related configuration and security rules:

```text
firebase-blueprint.json
firestore.rules
storage.rules
```

Configure your Firebase project and corresponding environment variables before using the application.

---

## Environment Configuration

The project provides an `.env.example` file containing the required environment variable structure.

Typical configuration includes:

```text
Firebase configuration
AI/Gemini configuration
Application configuration
```

Actual credentials should be stored locally in `.env`.

### Security Guidelines

Do not commit:

```text
.env
.env.local
API keys
Private keys
Passwords
Service account credentials
```

The `.gitignore` file is configured to help prevent sensitive environment files from being committed.

---

## Development

Start the development environment with:

```bash
npm run dev
```

After making changes, check the project status:

```bash
git status
```

Stage the changes:

```bash
git add .
```

Commit the changes:

```bash
git commit -m "Describe your changes"
```

Push them to GitHub:

```bash
git push origin main
```

---

## Core Modules

| Module         | Description                            |
| -------------- | -------------------------------------- |
| Dashboard      | Centralized financial overview         |
| Accounts       | Financial account management           |
| Transactions   | Income and expense tracking            |
| Bills          | Bill management                        |
| Budgets        | Budget planning and monitoring         |
| Savings Goals  | Financial goal tracking                |
| Groups         | Shared financial activities            |
| Reports        | Financial analysis and reporting       |
| Subscriptions  | Recurring subscription management      |
| AI Insights    | AI-powered financial analysis          |
| Admin          | Administrative functionality           |
| Settings       | Application configuration              |
| Authentication | User authentication and account access |

---

## Architecture Overview

Hisaab follows a modular application structure consisting of:

```text
User Interface
      │
      ▼
React + TypeScript
      │
      ├──────────────► Firebase Authentication
      │
      ├──────────────► Cloud Firestore
      │
      ├──────────────► Firebase Storage
      │
      └──────────────► Backend Services
                              │
                              ▼
                        Gemini AI Services
```

This structure separates the user interface, application logic, backend services, and external services into manageable modules.

---

## Data & Security

Hisaab uses Firebase services and security rules to manage application data.

Security-related configuration is maintained through:

```text
firestore.rules
storage.rules
```

Sensitive configuration values are handled through environment variables rather than being stored directly in the source code.

---

## Future Enhancements

Planned areas for further development may include:

* Advanced financial analytics
* Enhanced AI-powered financial recommendations
* Improved financial forecasting
* More detailed reporting
* Additional notification capabilities
* Expanded budgeting functionality
* Enhanced mobile experience
* Additional integrations

---

## Author

**Tanmay Patil**

GitHub: **[@Tanmay2109](https://github.com/Tanmay2109)**

---

## Repository

**Hisaab — Personal Finance Management Application**

GitHub Repository:

`https://github.com/Tanmay2109/Hisaab`

---

⭐ **If you find Hisaab useful, consider starring the repository.**
