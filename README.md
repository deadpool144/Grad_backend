# Alumni Connect V2 - Server

The backend for the Alumni Connect V2 platform, a professional networking system for alumni and students. Built with Node.js, Express, and MongoDB, featuring real-time communication and AI-powered integrations.

##  Features

- **Authentication**: Secure login/signup with JWT and OTP verification via Brevo.
- **Real-time Communication**: Live chat and notifications powered by Socket.io.
- **Media Management**: Image and document uploads handled via Multer and stored on Cloudinary.
- **AI Career Hub**: 
  - Automated Resume Data Extraction (PDF/Image/Word).
  - Smart Chat Assistant (Gemini/Ollama).
- **Social Features**: Post creation, commenting, liking, and alumni networking.
- **Security**: Rate limiting, express-validator for input sanitization, and BCrypt for password hashing.

##  Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Real-time**: [Socket.io](https://socket.io/)
- **AI**: [Google Gemini SDK](https://ai.google.dev/)
- **Storage**: [Cloudinary](https://cloudinary.com/)
- **Email**: [Brevo (Sendinblue)](https://www.brevo.com/)

##  Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB instance (Local or Atlas)
- Cloudinary Account
- Brevo API Key
- Google AI API Key (for Gemini)

### Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root of the `server` directory and configure the following:
   ```env
   PORT=5001
   MONGO_URL=your_mongodb_connection_string
   BREVO_API_KEY=your_brevo_api_key
   SENDER_EMAIL=your_email
   SENDER_NAME="Alumni Connect"
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   JWT_SECRET=your_jwt_secret
   CLIENT_URL=http://localhost:3000
   GOOGLE_API_KEY=your_google_ai_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

##  Project Structure

- `src/index.js`: Entry point.
- `src/app.js`: Express application setup.
- `src/controllers/`: Request handlers.
- `src/routes/`: API endpoint definitions.
- `src/models/`: Mongoose schemas.
- `src/services/`: Business logic and external integrations (AI, Cloudinary).
- `src/socket/`: Socket.io event handlers.
- `src/middlewares/`: Auth and validation middlewares.

##  License

This project is private and for educational purposes.
