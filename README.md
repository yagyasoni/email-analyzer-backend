# Email Analyzer Backend

## Overview
The **Email Analyzer Backend** is a Node.js/Express.js application that connects to a Gmail account via IMAP, retrieves emails with subjects starting with `Test-`, parses their headers to identify the Email Service Provider (ESP) and receiving chain, and stores results in MongoDB.  
It exposes API endpoints for the frontend to generate subjects and process emails.

---

## Features
- Generate unique email subjects (e.g., `Test-1631234567890`).  
- Retrieve emails from Gmail’s `[Gmail]/All Mail` folder using IMAP.  
- Parse email headers to extract ESP (e.g., Gmail) and receiving chain (SMTP headers).  
- Store results in MongoDB Atlas.  
- Provide endpoints:  
  - `/`  
  - `/email/generate-subject`  
  - `/email/process`  
  - `/email/latest`  

---

## Tech Stack
- **Node.js/Express.js**: Backend framework  
- **IMAP**: For email retrieval  
- **Mailparser**: For parsing email headers  
- **MongoDB**: Database for storing results  
- **Render**: Hosting platform for deployment  

---

## Prerequisites
- Node.js (v16 or higher) and npm  
- Git  
- Render account (for deployment)  
- Gmail account with **App Password**  
- MongoDB Atlas account  

---

## Setup Instructions

### Clone the Repository
```bash
git clone https://github.com/your-username/email-analyzer-backend.git
cd email-analyzer-backend
