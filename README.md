# :moneybag: Stash - Fintech Web App :chart_with_upwards_trend:

## :rocket: Getting Started

To run this project locally, follow these steps:

### Prerequisites
- Node.js (v16 or higher)
- MySQL Server
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FinFlow
   ```

2. **Set up the database**
   - Ensure MySQL is running on your system.
   - Run the database setup script:
     ```bash
     node database/setup-db.js
     ```
   - This will create the `finflow_db` database and required tables.

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Start the backend server**
   ```bash
   cd ../backend
   npm run dev
   ```
   The backend will run on `http://localhost:4000`

6. **Start the frontend**
   ```bash
   cd ../frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

### Environment Variables
- Backend: Copy `backend/.env` and adjust if needed (DB credentials, etc.)
- Frontend: The API link is set to `http://localhost:4000/` in `frontend/.env`

### Troubleshooting
- If registration fails, ensure the backend is running and database is set up.
- Check MySQL connection and credentials in `backend/.env`.
- Make sure ports 4000 and 5173 are available.

## :computer: Tech Stack

- **Frontend**: React.js (Functional React components)
- **Backend**: Node.js and Express.js using TypeScript
- **State Management**: Redux Toolkit
- **Database**: MySQL relational database (hosted separately)
- **UI Library**: Material-UI
- **Responsiveness**: Fully Responsive Design
- **UX/UI Design**: Collaborated with Tahmina Mustafayeva, a gifted UX/UI designer
- **Logo Design**: Created by Myself
- **Form Validation**: Joi Validator (both front and backend)
- **Authentication**: Token-based
- **Security**: Implemented security measures to safeguard user data
- **Integration**: Played with third-party open banking integration using TrueLayer (in development phase)
- **Local Storage**: Used for persistence and enhanced functionality
- **Version Control**: Git
- **CSS**: Custom Styling with some Material-UI components integrated
- **Testing**: Eslint, Vitest, and Jest
- **Deployment**: Hosted in the cloud on Render

## :book: About Stash

Stash is a user-friendly fintech web app designed to assist users in managing their finances. Whether it's setting up an INR account, making transfers, or editing profile details, Stash provides a seamless experience. While the app presently serves as an MVP version, there's scope for significant future expansions.

## :gear: Core Features

- Transactions: Enables users to pay and receive money seamlessly.
- Hub Section: Delivers insights on Indian macroeconomic data, including interest rates and inflation.
- User Management: Features like registration, INR account setup, profile editing, and more.
- Responsive Design: Guarantees flawless access across various devices.
- Security: Robust form validation and implemented protective measures against potential security threats.
  
## :bust_in_silhouette: Creator's Note

I, Kanan Garayev, envisioned and brought Stash to life during my personal time. Working both on the design and development, I also collaborated with Tahmina Mustafayeva, an expert UX/UI designer, which added a touch of professionalism to the design.

## :art: Design & Responsiveness

Stash's aesthetic appeal is a testament to detailed craftsmanship. Primarily styled using custom CSS, it integrates certain Material-UI components for specific purposes. Responsiveness isn't an afterthought – it's a core feature ensuring the app's fluidity across different devices.

## :link: Experience Stash

### :star: [Stash Web App](https://stash-uwns.onrender.com/) :star:

#### :sparkles: Highlights:

- Full-scale functional fintech application
- Efficient state management using Redux Toolkit
- Custom logo and CSS stylings for unique aesthetics
- Advanced form validation processes using Joi Validator
- Local storage integration for superior user experiences
- The "hub" section offering insights into macroeconomic data.
- Version control established via Git
  
#### :zap: Future Scope:

-Enhancements: Improve the "hub" section with financial news, goal setting, financial planning features.
- Stocks & Crypto: Introduce tools for buying/selling shares and cryptocurrencies.
- Integrations: Implementation of multi-factor authentication, OAuth, third-party integrations, and WebSocket for live chat support.
- Code Base: Consider using TypeScript for enhanced type safety.
- Functionalities: Additional features like autocomplete, transaction filtering, and analytics visualisation.

Stash is a testament to the dedication and skill of its creator, Kanan Garayev. Serving currently as an MVP, it already showcases robust functionalities and a promise of more to come. 
