# Phone Specs Database Viewer

A modern web application for viewing and managing phone specifications stored in a MariaDB database.

## Features

- **Modern Web Interface**: Clean, responsive design with Bootstrap 5
- **Database Integration**: Connects to MariaDB database with connection pooling
- **Search & Filter**: Search phones by name or manufacturer
- **Pagination**: Efficient data browsing with customizable page sizes
- **Detailed Views**: Complete specification sheets for each phone
- **REST API**: JSON endpoints for programmatic access
- **Error handling**: Graceful error handling and user feedback

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
   - Create the database and table using the provided SQL script:
     ```bash
     mysql -u root -p < database_setup.sql
     ```
   - Or manually run the SQL commands in `database_setup.sql`

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

2. **Phone Details** (`http://localhost:3000/phone/:id`):
   - View complete specifications for a specific phone
   - Organized into categories: Basic Info, Performance, Memory & Storage, Display, Camera, etc.

### API Endpoints

- **GET `/api/phones`**: Returns all phones in JSON format
- **GET `/api/phones/:id`**: Returns specific phone details in JSON format

Example API usage:
```bash
# Get all phones
curl http://localhost:3000/api/phones

# Get specific phone
curl http://localhost:3000/api/phones/1
```

## Database Schema

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

## File Structure

```
Project-1/
├── server.js              # Main application server
├── package.json           # Dependencies and scripts
├── database_setup.sql     # Database creation script
├── config/
│   └── database.js        # Database configuration
├── views/
│   ├── index.ejs          # Home page template
│   ├── details.ejs        # Phone details template
│   └── error.ejs          # Error page template
├── public/
│   └── style.css          # Custom styles
└── README.md              # This file
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
