# asset-management
🔐 Digital Asset Locker
A simple, secure Node.js web application to manage and store personal digital assets like PDFs, Certificates, and IDs locally using MongoDB.

🛠️ Prerequisites (What to Install)
Before running this application, ensure you have the following installed on your machine:

Node.js (v14.x or higher)

MongoDB Community Server

npm (Installed automatically with Node.js)

📂 Project Structure
Plaintext

asset-management/
├── models/
│   └── Asset.js        # MongoDB Schema for files
├── node_modules/       # Downloaded dependencies (ignored by Git)
├── public/
│   └── style.css       # Main application styling
├── uploads/            # Local storage for your uploaded files
├── views/
│   ├── login.ejs       # Centered login page
│   └── dashboard.ejs   # Asset list and search interface
├── .env                # Private Environment variables
├── .gitignore          # Tells Git which files to ignore
├── app.js              # Main Server & Logic
└── package.json        # Project metadata and dependencies
🚀 Getting Started
1. Clone the Repository
Bash

git clone https://github.com/SreshthaV/asset-management.git
cd asset-management
2. Install Dependencies
Bash

npm install
3. Setup Environment Variables
Create a .env file in the root directory and add:

Code snippet

PORT=3000
MONGO_URI=mongodb://localhost:27017/assetDB
SESSION_SECRET=your_secret_key
4. Run the Application
Make sure your MongoDB service is running, then execute:

Bash

node app.js
The app will be available at http://localhost:3000.

🔑 Default Credentials
User ID: admin

Password: password
