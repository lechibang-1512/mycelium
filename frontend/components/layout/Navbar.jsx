import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar as BSNavbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <BSNavbar bg="success" variant="dark" expand="lg" className="shadow-sm">
      <Container fluid>
        <BSNavbar.Brand as={Link} to="/">
          <i className="fas fa-boxes me-2"></i>
          Mycelium
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="navbar-nav" />
        <BSNavbar.Collapse id="navbar-nav">
          <Nav className="me-auto">
            <NavDropdown title={<><i className="fas fa-box me-1"></i>Inventory</>} id="inventory-dropdown" renderMenuOnMount>
              <NavDropdown.Item as={Link} to="/device-inventory">
                <i className="fas fa-mobile-alt me-1 text-info"></i>Device Inventory
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/spare-parts-inventory">
                <i className="fas fa-cogs me-1 text-warning"></i>Spare Parts Inventory
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/inventory/receive">
                <i className="fas fa-arrow-down me-1 text-success"></i>Receive Stock
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/inventory/dispense-stock">
                <i className="fas fa-arrow-up me-1 text-danger"></i>Dispense Stock
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/inventory-logs">
                <i className="fas fa-exchange-alt me-1 text-secondary"></i>Stock Movement
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/stocktake">
                <i className="fas fa-clipboard-check me-1 text-primary"></i>Stocktake
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/recommendations">
                <i className="fas fa-lightbulb me-1 text-warning"></i>Reorder Suggestions
              </NavDropdown.Item>
            </NavDropdown>

            <Nav.Link as={Link} to="/service">
              <i className="fas fa-tools me-1"></i>Service Center
            </Nav.Link>

            <Nav.Link as={Link} to="/invoices">
              <i className="fas fa-file-invoice-dollar me-1"></i>Invoices
            </Nav.Link>

            <Nav.Link as={Link} to="/suppliers">
              <i className="fas fa-truck me-1"></i>Suppliers
            </Nav.Link>

            <Nav.Link as={Link} to="/warehouses">
              <i className="fas fa-warehouse me-1"></i>Warehouses
            </Nav.Link>

            <NavDropdown title={<><i className="fas fa-user-shield me-1"></i>Admin</>} id="admin-dropdown" renderMenuOnMount>

              <NavDropdown.Item as={Link} to="/users">
                <i className="fas fa-users me-1 text-success"></i>Users
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/rbac/roles">
                <i className="fas fa-users-cog me-1 text-primary"></i>Roles & Permissions
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/rbac/users">
                <i className="fas fa-user-tag me-1 text-info"></i>User Roles
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>

          {/* User info and logout */}
          <Nav>
            {!loading && isAuthenticated && user && (
              <>
                <NavDropdown
                  title={
                    <span className="text-light">
                      <i className="fas fa-user-circle me-1"></i>
                      {user.fullName || user.username}
                    </span>
                  }
                  id="user-dropdown"
                  align="end"
                  renderMenuOnMount
                >
                  <NavDropdown.Item as={Link} to="/profile">
                    <i className="fas fa-user me-2 text-primary"></i>
                    My Profile
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout} className="text-danger">
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            )}
            {!loading && !isAuthenticated && (
              <Nav.Link as={Link} to="/login" className="text-light">
                <i className="fas fa-sign-in-alt me-1"></i>Login
              </Nav.Link>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
