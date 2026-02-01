import React from 'react';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();

  // Don't show footer on login, forgot password, or reset password pages
  const hideFooter = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname);

  if (hideFooter) {
    return null;
  }

  // Return empty footer - copyright text removed
  return null;
};

export default Footer;
