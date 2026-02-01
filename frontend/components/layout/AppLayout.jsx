import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';

/**
 * Main Application Layout
 * Wraps authenticated pages with navbar, footer, and toast notifications
 */
const AppLayout = () => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar />
      <main className="flex-grow-1">
        <Outlet />
      </main>
      <Footer />
      
      {/* Toast notifications container */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#198754',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#dc3545',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default AppLayout;
