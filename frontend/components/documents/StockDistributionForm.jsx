import React from 'react';
import './StockDistributionForm.css';

/**
 * Stock Distribution Form - Printable document for outgoing stock
 * Displays detailed information about distributed/dispensed inventory items
 */
const StockDistributionForm = ({ distribution, companyInfo }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const defaultCompanyInfo = {
    name: companyInfo?.name || 'Your Company Name',
    address: companyInfo?.address || '123 Business Street',
    city: companyInfo?.city || 'City, State 12345',
    phone: companyInfo?.phone || '(555) 123-4567',
    email: companyInfo?.email || 'info@company.com'
  };

  if (!distribution) {
    return <div className="stock-distribution-form">No distribution data available</div>;
  }

  return (
    <div className="stock-distribution-form">
      {/* Header */}
      <div className="distribution-header">
        <div className="company-info">
          <h1>{defaultCompanyInfo.name}</h1>
          <p>{defaultCompanyInfo.address}</p>
          <p>{defaultCompanyInfo.city}</p>
          <p>Phone: {defaultCompanyInfo.phone}</p>
          <p>Email: {defaultCompanyInfo.email}</p>
        </div>
        <div className="distribution-title">
          <h2>STOCK OUT (GDN)</h2>
          <p className="distribution-type">
            {distribution.transaction_type === 'outgoing' ? 'Goods Delivery Note' : 'Stock Out Form'}
          </p>
        </div>
      </div>

      {/* Distribution Information */}
      <div className="distribution-info-section">
        <div className="info-row">
          <div className="info-column">
            <strong>GDN No:</strong>
            <span>{distribution.receipt_id || distribution.transaction_group_id}</span>
          </div>
          <div className="info-column">
            <strong>Date:</strong>
            <span>{formatDate(distribution.transaction_date)}</span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-column">
            <strong>From Warehouse:</strong>
            <span>{distribution.from_warehouse_name || distribution.warehouse_name || 'N/A'}</span>
          </div>
          <div className="info-column">
            <strong>From Zone:</strong>
            <span>{distribution.from_zone_name || distribution.zone_name || 'N/A'}</span>
          </div>
        </div>
        {distribution.to_warehouse_name && (
          <div className="info-row">
            <div className="info-column">
              <strong>To Warehouse:</strong>
              <span>{distribution.to_warehouse_name}</span>
            </div>
            <div className="info-column">
              <strong>To Zone:</strong>
              <span>{distribution.to_zone_name || 'N/A'}</span>
            </div>
          </div>
        )}
        <div className="info-row">
          <div className="info-column">
            <strong>Issued By:</strong>
            <span>{distribution.user_name || 'N/A'}</span>
          </div>
          <div className="info-column">
            <strong>Department/Recipient:</strong>
            <span>_____________________________</span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-column full-width">
            <strong>Purpose:</strong>
            <span>_________________________________________________________</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product Description</th>
            <th>Manufacturer</th>
            <th>Condition</th>
            <th>Batch/Serial</th>
            <th>Quantity Issued</th>
            <th>Unit Cost</th>
            <th>Total Value</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {distribution.items && distribution.items.map((item, index) => (
            <tr key={item.log_id || index}>
              <td>{index + 1}</td>
              <td>{item.product_name || 'N/A'}</td>
              <td>{item.product_maker || '-'}</td>
              <td>{item.condition || 'NEW'}</td>
              <td>
                {item.serial_number ? `S/N: ${item.serial_number}` : ''}
                {item.batch_no ? `Batch: ${item.batch_no}` : '-'}
              </td>
              <td className="text-right">{Math.abs(item.quantity) || 0}</td>
              <td className="text-right">{formatCurrency(item.unit_cost)}</td>
              <td className="text-right">{formatCurrency(item.total_amount)}</td>
              <td className="remarks-cell"></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan="7" className="text-right"><strong>Total Value:</strong></td>
            <td className="text-right"><strong>{formatCurrency(distribution.totals?.total_amount)}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {distribution.notes && (
        <div className="notes-section">
          <strong>Notes:</strong>
          <p>{distribution.notes}</p>
        </div>
      )}

      {/* Special Instructions */}
      <div className="instructions-section">
        <strong>Special Instructions / Handling Requirements:</strong>
        <div className="instructions-box">
          <p>___________________________________________________________________________</p>
          <p>___________________________________________________________________________</p>
          <p>___________________________________________________________________________</p>
        </div>
      </div>

      {/* Acknowledgment & Signatures */}
      <div className="acknowledgment-section">
        <div className="acknowledgment-text">
          <p><strong>Acknowledgment of Receipt:</strong></p>
          <p>I hereby acknowledge that I have received the above-mentioned items in good condition and agree to be responsible for their proper use and safekeeping.</p>
        </div>
      </div>

      <div className="signatures-section">
        <div className="signature-block">
          <div className="signature-line"></div>
          <p><strong>Issued By</strong></p>
          <p>Name: {distribution.user_name || '_______________________'}</p>
          <p>Date: ________________________</p>
          <p>Signature: ___________________</p>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <p><strong>Received By</strong></p>
          <p>Name: _______________________</p>
          <p>Date: ________________________</p>
          <p>Signature: ___________________</p>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <p><strong>Authorized By</strong></p>
          <p>Name: _______________________</p>
          <p>Date: ________________________</p>
          <p>Signature: ___________________</p>
        </div>
      </div>

      {/* Footer */}
      <div className="distribution-footer">
        <p><strong>Important:</strong> This form must be signed by the recipient and returned to the warehouse within 24 hours.</p>
        <p>Please report any discrepancies immediately to the Inventory Department.</p>
        <p className="print-info">Printed on: {formatDate(new Date())}</p>
      </div>
    </div>
  );
};

export default StockDistributionForm;
