import React from 'react';

// Full page spinner for route transitions
export const PageSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
      <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <p className="text-muted">{message}</p>}
    </div>
  );
};
