# Phone Specs & Suppliers Database Viewer

A modern web application for viewing and managing phone specifications and supplier information stored in MariaDB databases.

## Features

- **Modern Web Interface**: Clean, responsive design with Bootstrap 5
- **Dual Database Support**: Connects to both phone specs and suppliers databases
- **Authentication & Authorization**: Complete user authentication system with role-based permissions
  - Three role levels: Admin, Staff, and User
  - Protected routes based on user permissions
  - Profile management functionality
- **Phone Specifications Viewer**: Complete phone database with detailed specs
- **Suppliers Management**: Complete CRUD system for supplier management
  - Add new suppliers with comprehensive information
  - Edit existing supplier details
  - Toggle supplier active/inactive status
  - Delete suppliers with confirmation
  - Search and filter capabilities
- **Search & Filter**: Search phones by name/manufacturer, suppliers by name/contact/email
- **Pagination**: Efficient data browsing with customizable page sizes
- **Detailed Views**: Complete specification sheets for phones and supplier details
- **REST API**: JSON endpoints for programmatic access to both databases
- **Error handling**: Graceful error handling and user feedback
- **Navigation**: Easy switching between phones and suppliers sections

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MariaDB
- **Frontend**: EJS templates, Bootstrap 5, Font Awesome
- **Styling**: Custom CSS with modern design patterns

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /home/lechibang/Documents/Project-1
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   - Make sure MariaDB/MySQL is installed and running
   - Create the phone specifications database and table:
     ```bash
     mysql -u root -p < database_setup.sql
     ```
   - Create the suppliers database and table:
     ```bash
     mysql -u root -p < suppliers_db_setup.sql
     ```
   - Or manually run the SQL commands in both files

4. **Configure Database Connection**:
   - Edit `server.js` and update the database configuration:
     ```javascript
     const dbConfig = {
         host: 'localhost',        // Your database host
         user: 'your_username',    // Your database username  
         password: 'your_password', // Your database password
         database: 'master_specs_db',
         connectionLimit: 5
     };
     ```
   
   - Or use environment variables:
     ```bash
     export DB_HOST=localhost
     export DB_USER=your_username
     export DB_PASSWORD=your_password
     export DB_NAME=master_specs_db
     ```

5. **Start the application**:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

## Usage

### Web Interface

1. **Home Page** (`http://localhost:3000`):
   - View all phone specifications in a card layout
   - Search by phone name or manufacturer
   - Navigate through pages with pagination
   - Adjust items per page (10, 20, 50)
   - Access suppliers section via navigation

2. **Phone Details** (`http://localhost:3000/phone/:id`):
   - View complete specifications for a specific phone
   - Organized into categories: Basic Info, Performance, Memory & Storage, Display, Camera, etc.

3. **Suppliers Page** (`http://localhost:3000/suppliers`):
   - View all suppliers in a card layout
   - Search by supplier name, contact person, or email
   - Navigate through pages with pagination
   - Access phone specs section via navigation

4. **Supplier Details** (`http://localhost:3000/supplier/:id`):
   - View complete supplier information
   - Organized into categories: Basic Info, Address & Location, Business Info, Status & Notes

5. **User Authentication**:
   - Register, login, and manage user profiles
   - Admins can manage all users and suppliers
   - Staff have limited access to phone and supplier data
   - Users can view phones and suppliers, and manage their own profiles

### API Endpoints

**Phone Specifications:**
- **GET `/api/phones`**: Returns all phones in JSON format
- **GET `/api/phones/:id`**: Returns specific phone details in JSON format

**Suppliers:**
- **GET `/api/suppliers`**: Returns all suppliers in JSON format  
- **GET `/api/suppliers/:id`**: Returns specific supplier details in JSON format

**Authentication:**
- **POST `/api/register`**: Registers a new user
- **POST `/api/login`**: Authenticates a user and returns a token
- **GET `/api/profile`**: Returns the authenticated user's profile
- **PUT `/api/profile`**: Updates the authenticated user's profile

Example API usage:
```bash
# Get all phones
curl http://localhost:3000/api/phones

# Get specific phone
curl http://localhost:3000/api/phones/1

# Get all suppliers
curl http://localhost:3000/api/suppliers

# Get specific supplier
curl http://localhost:3000/api/suppliers/1

# Register a new user
curl -X POST http://localhost:3000/api/register -d "username=test&password=test123"

# Login
curl -X POST http://localhost:3000/api/login -d "username=test&password=test123"

# Get user profile
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/profile
```

## Database Schemas

### Phone Specifications Database (`master_specs_db`)

The `phone_specs` table includes the following fields:

### Basic Information
- `id` - Primary key
- `sm_name` - Phone model name
- `sm_maker` - Manufacturer
- `sm_price` - Price
- `sm_inventory` - Stock quantity
- `color` - Available color

### Performance
- `processor` - CPU model
- `process_node` - Manufacturing process
- `cpu_cores` - Number of CPU cores
- `cpu_frequency` - CPU frequency
- `gpu` - Graphics processor

### Memory & Storage
- `memory_type` - RAM type
- `ram` - RAM capacity
- `rom` - Internal storage
- `expandable_memory` - External storage support

### Display
- `display_size` - Screen size in inches
- `resolution` - Screen resolution
- `pixel_density` - PPI
- `refresh_rate` - Display refresh rate
- `brightness` - Maximum brightness
- `display_features` - Additional display features

### Camera
- `rear_camera_main` - Main rear camera specs
- `rear_camera_macro` - Macro camera specs
- `rear_camera_features` - Camera features
- `rear_video_resolution` - Video recording capability
- `front_camera` - Front camera specs
- `front_camera_features` - Front camera features
- `front_video_resolution` - Front video recording

### Physical & Battery
- `length_mm`, `width_mm`, `thickness_mm` - Dimensions
- `weight_g` - Weight in grams
- `battery_capacity` - Battery capacity
- `fast_charging` - Charging specifications
- `water_and_dust_rating` - IP rating

### Connectivity & Features
- `connector` - Charging/data port type
- `security_features` - Security options
- `sim_card` - SIM card support
- `nfc` - NFC support
- `network_bands` - Supported network bands
- `wireless_connectivity` - Wi-Fi, Bluetooth specs
- `navigation` - GPS and positioning
- `audio_jack` - Audio port availability
- `sensors` - Built-in sensors
- `operating_system` - OS version
- `package_contents` - Included accessories

### Suppliers Database (`suppliers_db`)

The `suppliers` table includes the following fields:

#### Basic Information
- `supplier_id` - Primary key
- `supplier_name` - Company name
- `contact_person` - Main contact person
- `email` - Contact email
- `phone` - Contact phone number
- `website` - Company website

#### Address & Location
- `address` - Street address
- `city` - City
- `state_province` - State or province
- `postal_code` - ZIP/postal code
- `country` - Country

#### Business Information  
- `business_type` - Type of business (manufacturer, distributor, etc.)
- `tax_id` - Tax identification number
- `registration_number` - Business registration number
- `payment_terms` - Payment terms (Net 30, etc.)
- `credit_limit` - Credit limit amount

#### Status & Management
- `status` - Active, inactive, or pending
- `rating` - Supplier rating (1-5 stars)
- `notes` - Additional notes
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

## File Structure

```
Project-1/
├── server.js                    # Main application server
├── package.json                 # Dependencies and scripts
├── database_setup.sql          # Phone specs database creation script
├── suppliers_db_setup.sql      # Suppliers database creation script
├── config/
│   └── database.js             # Database configuration
├── views/
│   ├── index.ejs               # Phone specs home page
│   ├── details.ejs             # Phone details page
│   ├── suppliers.ejs           # Suppliers home page
│   ├── supplier-details.ejs    # Supplier details page
│   └── error.ejs               # Error page template
├── public/
│   └── style.css               # Custom styles
└── README.md                   # This file
```

## Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

## Environment Variables

You can use environment variables for configuration:

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database username (default: root)
- `DB_PASSWORD` - Database password (default: empty)
- `DB_NAME` - Database name (default: master_specs_db)
- `PORT` - Application port (default: 3000)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License

## Support

For issues or questions, please check the database connection settings and ensure MariaDB is running properly.

## Sample Data

The `database_setup.sql` file includes sample data for iPhone 15 Pro and Galaxy S24 Ultra to help you get started quickly.
