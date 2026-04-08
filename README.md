# Asset Management Locker

A full-stack web application for securely storing, organizing, and managing your digital assets — documents, certificates, insurance papers, IDs, and more — all in one place with role-based access control and email OTP verification.

## Features

- **Secure Authentication** — Login and signup with email-based OTP verification. New accounts are only created after OTP confirmation.
- **Role-Based Access** — Two roles: `user` and `admin`. Admins can manage all users, change roles, and access the SQL editor.
- **Asset Management** — Upload files with metadata: title, category, sub-type, description, issuing authority, and expiry date.
- **Expiry Tracking** — Dashboard highlights assets expiring within 30 days and flags already-expired documents.
- **File Versioning** — Upload new versions of an asset while keeping the full version history.
- **File Sharing** — Generate public share links for any asset. Links can be revoked at any time.
- **Export as ZIP** — Download all your assets in a single ZIP file.
- **Storage Analytics** — Visual breakdown of storage usage by category with a percentage meter.
- **Search & Filter** — Search assets by name and filter by category in real time.
- **Admin Panel** — View all registered users, change roles, and edit SQL files directly from the browser.
- **Profile Page** — View account details, storage stats, and manage your files.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Templating | EJS |
| Auth DB | MySQL (users, OTPs) |
| Asset DB | MongoDB + Mongoose |
| File Uploads | Multer |
| Email (OTP) | Nodemailer (Gmail SMTP) |
| Sessions | express-session |
| Archiving | Archiver (ZIP export) |

## Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL
- MongoDB (local or Atlas)
- Gmail account with an [App Password](https://support.google.com/accounts/answer/185833)

### Installation

```bash
git clone https://github.com/SreshthaV/asset-management.git
cd asset-management
bash setup.sh
```

The setup script will install dependencies, configure your `.env`, and set up the MySQL database automatically.

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
MONGO_URI=mongodb://localhost:27017/asset-management
SESSION_SECRET=your_random_secret

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=asset_management_auth

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

OTP_EXPIRY_MINUTES=10
PORT=3000
```

### Default Admin Login

```
Email:    admin@yourdomain.com
Password: Admin@123
```
> Change this immediately after first login.

## Running the App

```bash
npm start        # production
npm run dev      # development with auto-reload (requires nodemon)
```

App runs at `http://localhost:3000`
