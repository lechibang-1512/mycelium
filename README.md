#DISCLAIMER : WORK IN PROGRESS.
# mycelium ERP

mycelium ERP is a local-based Enterprise Resource Planning (ERP) system designed for small and medium-sized businesses who require on-premises control of their business processes. Built using EJS, JavaScript, and CSS, mycelium ERP provides a customizable, user-friendly solution for managing core business operations offline or within a private network.

## Features

- Local deployment for data privacy and control
- Modular design for easy customization and extension
- User authentication and role-based access management
- Dashboard for business analytics and reporting
- Inventory and order management
- Customer and supplier management
- Responsive interface for desktop and mobile browsers

## Tech Stack

- **Frontend:** EJS, JavaScript, CSS
- **Backend:** Node.js (presumed from EJS usage)
- **Database:** (Specify your local DB, e.g., MongoDB, MySQL, SQLite)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or higher)
- [npm](https://www.npmjs.com/)
- (Database server, if not using a file-based DB)

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/lechibang-1512/Project-1.git
    cd Project-1
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Configuration:**
    - Copy `.env.example` to `.env` in the root directory:
        ```bash
        cp .env.example .env
        ```
    - Edit the `.env` file with your database credentials and configuration:
        ```env
        # Database Configuration
        DB_HOST=localhost
        DB_PORT=3306
        DB_USER=your_db_user
        DB_PASSWORD=your_db_password
        DB_NAME=master_specs_db

        # Suppliers Database Configuration
        SUPPLIERS_DB_HOST=localhost
        SUPPLIERS_DB_PORT=3306
        SUPPLIERS_DB_USER=your_db_user
        SUPPLIERS_DB_PASSWORD=your_db_password
        SUPPLIERS_DB_NAME=suppliers_db

        # Authentication Database Configuration
        AUTH_DB_HOST=localhost
        AUTH_DB_PORT=3306
        AUTH_DB_USER=your_db_user
        AUTH_DB_PASSWORD=your_db_password
        AUTH_DB_NAME=users_db

        # Session Configuration
        SESSION_SECRET=your-secret-key-here

        # Server Configuration
        PORT=3000
        NODE_ENV=development
        ```
        
    **⚠️ Important Security Notes:**
    - All database credentials are now **required** environment variables
    - No fallback credentials are used for enhanced security
    - Generate a cryptographically secure SESSION_SECRET using:
      ```bash
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
      ```

4. **Verify your configuration:**
    ```bash
    npm run verify-env
    ```
    
    This will check that all required environment variables are set and test database connections.

5. **Run the application:**
    ```bash
    npm start
    ```

6. **Access the system:**
    - Open your browser and go to `http://localhost:3000` (or your configured port).

## Project Structure

```
.
├── public/          # Static assets (CSS, JS, images)
├── views/           # EJS templates
├── routes/          # Application routes
├── models/          # Database models
├── controllers/     # Business logic
├── app.js           # Main application file
└── README.md
```

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Express.js](https://expressjs.com/)
- [EJS](https://ejs.co/)
- [Node.js](https://nodejs.org/)
