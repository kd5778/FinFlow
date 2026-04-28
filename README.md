# 💸 FinFlow - Fintech Web App 📈

A full-stack fintech web application for secure money management, P2P transfers, and transaction tracking.

---

## 🚀 Features

- 💸 P2P money transfer with safe transaction handling  
- 📊 Real-time transaction history dashboard  
- 🔐 JWT-based authentication  
- 📧 Password reset via email (Nodemailer)  
- 💱 Multi-currency support  
- 📱 Fully responsive design  

---

## 🛠️ Tech Stack

- **Frontend:** React.js (Vite)  
- **Backend:** Node.js, Express.js  
- **Database:** MySQL (`mysql2`)  
- **State Management:** Redux Toolkit  
- **Authentication:** JWT  
- **Email Service:** Nodemailer  

---

## 📂 Project Structure

    FinFlow/
    │
    ├── backend/
    ├── frontend/
    ├── database/
    └── README.md

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MySQL Server
- npm or yarn

---

## 📦 Installation

1. **Clone the repository**
    
        git clone <repository-url>
        cd FinFlow

2. **Set up the database**
    
    - Ensure MySQL is running on your system.
    - Run the database setup script:
        
            node database/setup-db.js

3. **Install backend dependencies**
    
        cd backend
        npm install

4. **Install frontend dependencies**
    
        cd ../frontend
        npm install

---

## ▶️ Running the Application

1. **Start backend**
    
        cd backend
        npm start

   Backend runs on: http://localhost:4000

2. **Start frontend**
    
        cd frontend
        npm run dev

   Frontend runs on: http://localhost:5173

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

    PORT=4000
    FRONTEND_ORIGIN=http://localhost:5173
    JWT_SECRET=your_super_secret_jwt_key

    DB_HOST=localhost
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=finflow_db

    SMTP_HOST=smtp.yourprovider.com
    SMTP_PORT=587
    SMTP_USER=your_email@example.com
    SMTP_PASS=your_email_password
    SMTP_SECURE=false

### Frontend (`frontend/.env`)

    VITE_API_LINK=http://localhost:4000/

---

## 🔄 Application Flow

1. User registers or logs in  
2. JWT token is generated  
3. User performs transactions  
4. Backend ensures safe database operations  
5. Transactions are stored and displayed  

---

## 🛡️ Security Features

- Password hashing  
- JWT authentication  
- Token expiration handling  
- Secure transaction logic  
- Email-based password reset  

---

## 🐛 Troubleshooting

- Registration fails → Check backend & DB setup  
- DB connection error → Verify `.env` credentials  
- Email not sending → Check SMTP config  
- Port issues → Ensure ports 4000 & 5173 are free  

---

## ✨ Future Scope

- Analytics dashboard (charts)  
- Open banking integration (Plaid / TrueLayer)  
- Two-Factor Authentication (2FA)  
- OAuth login (Google, GitHub)  
- Real-time notifications (WebSockets)  

---

## 📜 License

MIT License
