# 🛡️ Vulnerable Account Shop - Security Demo

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org/)
[![Vulnerability Count](https://img.shields.io/badge/vulnerabilities-3%20Core-red)](#vulnerabilities)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A deliberately vulnerable web application simulating a game account marketplace. This project is designed for **educational purposes** to demonstrate common web security pitfalls (SQLi, IDOR, and XSS) and their corresponding fixes.

---

## 🚀 Features

- **🛒 Account Marketplace**: Browse, view, and purchase game accounts.
- **🔐 User System**: Registration, login (vulnerable), and JWT-based session management.
- **📜 Order History**: View your purchased accounts (vulnerable to IDOR).
- **💬 Review System**: Leave feedback on accounts (vulnerable to Stored XSS).
- **😈 Hacker C2 Server**: A secondary server to receive stolen cookies/data from XSS attacks.

---

## 🔴 Core Vulnerabilities

This project serves as a laboratory for the following vulnerabilities:

### 1. SQL Injection (SQLi)
- **Endpoint**: `/api/auth/login`
- **Issue**: Credential checking uses unsafe string concatenation.
- **Exploit**: Bypass login using `' OR 1=1 --`.

### 2. Insecure Direct Object Reference (IDOR)
- **Endpoint**: `/api/orders/:orderId`
- **Issue**: Lack of authorization checks on order ownership.
- **Exploit**: Access any user's purchased account credentials by changing the ID in the URL.

### 3. Stored Cross-Site Scripting (XSS)
- **Endpoint**: `/api/reviews` (Submission) & `/` (Display)
- **Issue**: User input is rendered directly into the DOM using `innerHTML`.
- **Exploit**: Inject malicious `<script>` tags to steal session cookies.

---

## 📁 Project Structure

```bash
├── public/              # Frontend assets (HTML, CSS, JS)
├── hacker_server/       # C2 Server for data collection during XSS
│   ├── logs.json        # Stolen data storage
│   └── server.js        # Express server (Port 4000)
├── server.js            # Main application server (Port 3000)
├── database.js          # SQLite database configuration
├── shop.db              # SQLite database file
├── security_guide.md    # DETAILED guide on exploits and fixes
└── package.json         # Project dependencies
```

---

## 🛠️ Setup & Instruction

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed.

### 2. Installation
```bash
npm install
```

### 3. Running the Marketplace
```bash
npm start
```
The shop will be available at: [http://localhost:3000](http://localhost:3000)

### 4. Running the Hacker Server (Optional)
To test XSS cookie stealing:
```bash
cd hacker_server
npm install
node server.js
```
The C2 server will be available at: [http://localhost:4000](http://localhost:4000)

---

## 📚 Security Guide

For a step-by-step walkthrough on how to exploit these vulnerabilities and how to patch them, please refer to the:
👉 **[Security Guide (security_guide.md)](security_guide.md)**

---

## ⚠️ Disclaimer

This application is **INTENTIONALLY VULNERABLE**. Do not use any of the coding patterns found in this project in production environments. Running this application on a public-facing server is highly discouraged as it can be easily compromised.

---
*Created for security research and training purposes.*
