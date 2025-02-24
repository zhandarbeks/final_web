# Fragrance store

# Project overview

This project is a web application that allows users to explore, filter, and purchase fragrances. The backend is built using MongoDB (NoSQL) and features a RESTful API to manage user data and cart items. It incorporates advanced database operations including CRUD functionality, nested documents, aggregation pipelines, and complex queries.
 
## Cloning the repository
To clone the repository from GitHub, execute the following command in your terminal:
```bash
git clone https://github.com/zhandarbeks/final_project.git


## Installation and running
Install the dependencies, run the following command in your terminal:
```bash
npm install

Start the server with the following command:
```bash
npm start

---

# Technologies Used

### Frontend
- HTML, CSS, JavaScript: For building the user interface and implementing client-side functionality.
- EJS (Embedded JavaScript Templates): For dynamically rendering page content.

### Backend
- Node.js: Runtime environment used for server-side logic.
- Express.js: Web framework for setting up the server and defining RESTful API routes.
- Mongoose: Provides a straightforward way to interact with MongoDB through object modeling.

### Database
- MongoDB Atlas: Cloud-hosted NoSQL database for storing user information, fragrances, and cart data.

### Authentication and security
- Bcrypt.js: Used for password encryption before saving user credentials.

### Deployment
- MongoDB Atlas: Cloud storage solution for scalability and easy database access.
Railway: Cloud platform used for hosting the web application.

---

# Key Features

### CRUD Operations:
- Create: Users can register accounts and add fragrances to their cart.
- Read: Users can browse the fragrance catalog, view their profile, and check their cart.
- Update: Users can update profile details (e.g., name, profile picture) and modify product information.
- Delete: Users can delete their accounts; admins have the ability to remove users or fragrances.

### User Authentication and Authorization:
- Login/Logout: Secure login and logout functionalities.
- Admin Role: Admin users can manage other users, including role changes or account deletions.
- Session Management: User sessions are maintained using cookies, and authentication is handled via JWT tokens.

### Database Schema and Data Modeling:
- User Schema: Contains fields like name, email, password, role (user/admin), profile picture, and cart items.
- Fragrance Schema: Stores fragrance details such as name, brand, scent, size, price, and image URL.

# final_web
